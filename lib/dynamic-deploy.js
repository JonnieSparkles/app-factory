// Dynamic deployment system for Arweave apps
// Handles uploading only changed files and updating manifests

import { ManifestManager } from './manifest-manager.js';
import { GitTracker } from './git-tracker.js';
import { uploadToArweave, loadWallet } from './arweave.js';
import { createUndernameRecord, getUndernameRecord } from './arns.js';
import { readFile, readFileBinary, isBinaryFile, formatBytes, guessContentType, loadConfig, normalizePath } from './utils.js';
import { AoANTWriteable } from '@ar.io/sdk';
import path from 'path';

export class DynamicDeployer {
  constructor(appId, appPath) {
    this.appId = appId;
    this.appPath = appPath;
    this.manifestManager = new ManifestManager(appId, appPath);
    this.gitTracker = new GitTracker(appId, appPath);
  }

  // ---------- Main Deployment Method ----------

  async deploy(testMode = false) {
    console.log(`🚀 Starting dynamic deployment for app: ${this.appId}`);
    
    try {
      // 1. Validate git repository
      if (!(await this.gitTracker.isGitRepository())) {
        throw new Error('Not in a git repository. Dynamic deployment requires git.');
      }

      // 2. Get current commit info
      const commitInfo = await this.gitTracker.getCommitInfo();
      console.log(`📝 Current commit: ${commitInfo.shortHash} - ${commitInfo.message}`);

      // 3. Get last deployment info from deployment tracker
      const currentTracker = await this.manifestManager.loadDeploymentTracker();
      const lastDeployCommit = currentTracker.lastDeployCommit;
      console.log(`🔍 Last deployment commit: ${lastDeployCommit || 'none (first deployment)'}`);

      // 4. Find changed files using hash-based detection
      const { changedFiles, currentFiles } = await this.manifestManager.getChangedFilesByHash(this.gitTracker);
      console.log(`📁 Changed files: ${changedFiles.length}`)

      if (changedFiles.length === 0) {
        return {
          success: true,
          skipped: true,
          reason: 'no_changes',
          appId: this.appId,
          commitHash: commitInfo.shortHash
        };
      }

      // 5. Load current manifest
      const currentManifest = await this.manifestManager.loadManifest();

      // 6. Upload changed files
      console.log(`📤 Uploading ${changedFiles.length} changed files...`);
      const { newFileIds, fileHashes } = await this.uploadChangedFiles(changedFiles, testMode);

      // 7. Update manifest with new file IDs (and remove deleted files)
      const updatedManifest = await this.updateManifestWithNewFiles(currentManifest, newFileIds, currentFiles);
      console.log(`📋 Updated manifest with ${Object.keys(newFileIds).length} new file IDs`);

      // 8. Upload updated manifest
      console.log(`☁️ Uploading manifest to Arweave...`);
      const manifestTxId = await this.uploadManifest(updatedManifest, testMode);
      console.log(`✅ Manifest uploaded: ${manifestTxId}`);

      // 9. Create or update ArNS record
      console.log(`🔗 Creating ArNS record: ${commitInfo.shortHash} → ${manifestTxId}`);
      const undername = await this.createArNSRecord(commitInfo.shortHash, manifestTxId, testMode);

      // 10. Update deployment tracker
      await this.manifestManager.updateDeploymentTracker(
        commitInfo.shortHash,
        manifestTxId,
        changedFiles,
        fileHashes,
        currentFiles
      );

      // 11. Save updated manifest locally
      await this.manifestManager.saveManifest(updatedManifest);

      // 12. Create deployment commit (if not in test mode)
      // Note: In CI environments, we rely on the GitHub Actions workflow to commit these files
      if (!testMode) {
        const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
        if (!isCI) {
          await this.gitTracker.createDeployCommit(manifestTxId, changedFiles, updatedManifest.version);
          console.log(`📝 Created deployment commit`);
        } else {
          console.log(`📝 Deployment files written - will be committed by GitHub Actions workflow`);
        }
      }

      // 13. Calculate deployment stats
      const stats = await this.calculateDeploymentStats(changedFiles, newFileIds);

      console.log(`🎉 Dynamic deployment complete!`);
      console.log(`   📁 Files changed: ${changedFiles.length}`);
      console.log(`   📦 Total size: ${formatBytes(stats.totalSize)}`);
      console.log(`   🔗 Manifest TX: ${manifestTxId}`);
      console.log(`   🔗 ArNS: ${undername}`);

      return {
        success: true,
        appId: this.appId,
        version: updatedManifest.version,
        commitHash: commitInfo.shortHash,
        manifestTxId: manifestTxId,
        undername: undername,
        changedFiles: changedFiles,
        newFileIds: newFileIds,
        stats: stats,
        testMode: testMode
      };

    } catch (error) {
      console.error(`❌ Dynamic deployment failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        appId: this.appId
      };
    }
  }

  // ---------- File Upload Methods ----------

  async uploadChangedFiles(changedFiles, testMode = false) {
    const fileIds = {};
    const fileHashes = {};
    const wallet = await loadWallet();

    for (let i = 0; i < changedFiles.length; i++) {
      const filePath = changedFiles[i];
      const relativePath = normalizePath(path.relative(this.appPath, filePath));
      
      console.log(`[${i + 1}/${changedFiles.length}] Uploading ${relativePath}...`);
      
      try {
        const isBinary = isBinaryFile(filePath);
        const fileContent = isBinary ? await readFileBinary(filePath) : await readFile(filePath);
        const fileSize = isBinary ? fileContent.length : Buffer.byteLength(fileContent, 'utf8');
        
        // Calculate file hash for tracking
        const fileHash = await this.gitTracker.getFileHash(filePath);
        fileHashes[relativePath] = fileHash;
        
        if (testMode) {
          // In test mode, generate mock transaction ID
          const mockTxId = `test-${Date.now()}-${i}`;
          fileIds[filePath] = mockTxId;
          console.log(`✅ Test upload: ${mockTxId}`);
        } else {
          const contentType = guessContentType(filePath);
          const config = loadConfig();
          const txId = await uploadToArweave(
            isBinary ? fileContent : Buffer.from(fileContent, 'utf-8'),
            contentType,
            config.appName,
            wallet
          );
          fileIds[filePath] = txId;
        }
      } catch (error) {
        throw new Error(`Failed to upload ${relativePath}: ${error.message}`);
      }
    }

    return { newFileIds: fileIds, fileHashes };
  }

  async uploadManifest(manifest, testMode = false) {
    const wallet = await loadWallet();
    const manifestContent = JSON.stringify(manifest, null, 2);
    
    if (testMode) {
      return `test-manifest-${Date.now()}`;
    }
    
    // Upload manifest as JSON file directly (don't use the uploadManifest helper which expects pathMap)
    const config = loadConfig();
    return await uploadToArweave(
      Buffer.from(manifestContent, 'utf-8'),
      'application/x.arweave-manifest+json',
      config.appName,
      wallet,
      [{ name: 'Type', value: 'manifest' }]
    );
  }

  // ---------- Manifest Management ----------

  async updateManifestWithNewFiles(currentManifest, newFileIds, currentFiles) {
    const updatedManifest = { ...currentManifest };
    
    // Keep manifest specification version fixed at 0.2.0
    updatedManifest.version = "0.2.0";
    
    // Update index path to correct entry point if needed
    const correctEntryPoint = await this.manifestManager.getEntryPoint();
    if (updatedManifest.index?.path !== correctEntryPoint) {
      console.log(`📝 Updating index path from "${updatedManifest.index?.path}" to "${correctEntryPoint}"`);
      updatedManifest.index = { path: correctEntryPoint };
    }
    
    // Convert current files to relative paths for comparison
    const currentRelativePaths = new Set(
      currentFiles.map(f => normalizePath(path.relative(this.appPath, f)))
    );
    
    // Clean up existing manifest - keep only files that still exist
    const cleanedPaths = {};
    for (const [relativePath, fileData] of Object.entries(updatedManifest.paths)) {
      // Keep the entry if:
      // 1. It's not a tracking file AND
      // 2. The file still exists in current tracked files
      if (!this.isTrackingFile(path.join(this.appPath, relativePath)) && 
          currentRelativePaths.has(relativePath)) {
        cleanedPaths[relativePath] = fileData;
      }
    }
    updatedManifest.paths = cleanedPaths;
    
    // Update paths with new file IDs (only non-tracking files)
    for (const [filePath, txId] of Object.entries(newFileIds)) {
      const relativePath = normalizePath(path.relative(this.appPath, filePath));
      if (!this.isTrackingFile(filePath)) {
        updatedManifest.paths[relativePath] = { id: txId };
      }
    }
    
    // Add manual TXID overrides
    const manualOverrides = await this.manifestManager.loadManualOverrides();
    for (const [relativePath, txId] of Object.entries(manualOverrides)) {
      updatedManifest.paths[relativePath] = { id: txId };
      console.log(`🔗 Added manual override: ${relativePath} → ${txId}`);
    }
    
    return updatedManifest;
  }

  isTrackingFile(filePath) {
    const fileName = path.basename(filePath);
    return fileName === 'manifest.json' || 
           fileName === 'deployment-tracker.json' ||
           fileName === 'manifest-overrides.json';
  }

  // ---------- ArNS Management ----------

  async createArNSRecord(commitHash, manifestTxId, testMode = false) {
    try {
      if (testMode) {
        console.log(`🧪 Test mode: Would create ArNS record ${commitHash} → ${manifestTxId}`);
        return commitHash;
      }

      // Create ANT instance
      const config = loadConfig();
      const wallet = await loadWallet();
      const ant = new AoANTWriteable({ 
        processId: config.antProcessId,
        signer: wallet
      });

      // Check if record already exists (with error handling)
      const existingRecord = await getUndernameRecord(ant, commitHash);
      if (existingRecord) {
        console.log(`⚠️ ArNS record already exists for ${commitHash}`);
        return commitHash;
      }

      // Create new ArNS record
      console.log(`📝 Creating ArNS record: ${commitHash} → ${manifestTxId}`);
      console.log(`🔍 Using TTL: 60 seconds`);
      const result = await createUndernameRecord(ant, commitHash, manifestTxId, 60);
      if (result.success) {
        console.log(`✅ ArNS record created: ${result.undername || commitHash}`);
        return commitHash;
      } else {
        throw new Error(`ArNS record creation failed: ${result.message}`);
      }
    } catch (error) {
      // If ArNS fails, log the error but don't fail the entire deployment
      console.error(`❌ ArNS record creation failed: ${error.message}`);
      console.log(`⚠️ Deployment will continue without ArNS record. The manifest is still accessible at: ${manifestTxId}`);
      console.log(`💡 You can manually create the ArNS record later if needed.`);
      
      // Return the commit hash anyway so deployment can continue
      return commitHash;
    }
  }

  // ---------- Statistics and Reporting ----------

  async calculateDeploymentStats(changedFiles, newFileIds) {
    let totalSize = 0;
    
    for (const filePath of changedFiles) {
      try {
        const isBinary = isBinaryFile(filePath);
        const content = isBinary ? await readFileBinary(filePath) : await readFile(filePath);
        totalSize += isBinary ? content.length : Buffer.byteLength(content, 'utf8');
      } catch (error) {
        console.warn(`⚠️ Could not calculate size for ${filePath}: ${error.message}`);
      }
    }

    return {
      totalSize: totalSize,
      fileCount: changedFiles.length,
      newFileIds: Object.keys(newFileIds).length
    };
  }

  // ---------- Utility Methods ----------

  async getDeploymentInfo() {
    const manifest = await this.manifestManager.loadManifest();
    const tracker = await this.manifestManager.loadDeploymentTracker();
    const commitInfo = await this.gitTracker.getCommitInfo();
    
    return {
      appId: this.appId,
      version: manifest.version,
      entryPoint: manifest.index?.path,
      fileCount: Object.keys(manifest.paths).length,
      lastDeployed: tracker.lastDeployed,
      deploymentCount: tracker.deploymentCount,
      lastDeployCommit: tracker.lastDeployCommit,
      currentCommit: commitInfo.shortHash,
      currentCommitMessage: commitInfo.message
    };
  }

  async getDeploymentHistory() {
    return await this.gitTracker.getDeploymentHistory();
  }

  async validateApp() {
    try {
      // Use the same file discovery logic as deployment
      const { changedFiles, currentFiles } = await this.manifestManager.getChangedFilesByHash(this.gitTracker);
      
      // For new apps, currentFiles should contain all git-tracked files
      if (currentFiles.length === 0) {
        throw new Error(`No git-tracked files found in ${this.appPath}`);
      }

      // Check if entry point exists
      await this.manifestManager.getEntryPoint();

      return {
        valid: true,
        appId: this.appId,
        appPath: this.appPath
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        appId: this.appId,
        appPath: this.appPath
      };
    }
  }
}
