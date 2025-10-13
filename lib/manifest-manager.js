// Per-app manifest management for incremental Arweave deployment
// Handles loading, updating, and saving app-specific manifests

import { readFile, writeFile, fileExists, getAllFilesInDirectory, isDirectory } from './utils.js';
import path from 'path';

export class ManifestManager {
  constructor(appId, appPath) {
    this.appId = appId;
    this.appPath = appPath;
    this.manifestPath = path.join(appPath, 'manifest.json');
    this.trackerPath = path.join(appPath, 'deployment-tracker.json');
  }

  // ---------- Manifest Operations ----------

  async loadManifest() {
    try {
      if (await fileExists(this.manifestPath)) {
        const manifestData = await readFile(this.manifestPath);
        return JSON.parse(manifestData);
      }
      return this.createEmptyManifest();
    } catch (error) {
      throw new Error(`Failed to load manifest for ${this.appId}: ${error.message}`);
    }
  }

  async saveManifest(manifest) {
    try {
      await writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
    } catch (error) {
      throw new Error(`Failed to save manifest for ${this.appId}: ${error.message}`);
    }
  }

  createEmptyManifest() {
    return {
      manifest: "arweave/paths",
      version: "0.2.0",
      index: { path: "index.html" },
      paths: {}
    };
  }

  // ---------- Deployment Tracker Operations ----------

  async loadDeploymentTracker() {
    try {
      if (await fileExists(this.trackerPath)) {
        const trackerData = await readFile(this.trackerPath);
        return JSON.parse(trackerData);
      }
      return this.createEmptyTracker();
    } catch (error) {
      throw new Error(`Failed to load deployment tracker for ${this.appId}: ${error.message}`);
    }
  }

  async saveDeploymentTracker(tracker) {
    try {
      await writeFile(this.trackerPath, JSON.stringify(tracker, null, 2));
    } catch (error) {
      throw new Error(`Failed to save deployment tracker for ${this.appId}: ${error.message}`);
    }
  }

  createEmptyTracker() {
    return {
      lastDeployCommit: null,
      deploymentHistory: [],
      fileCommitMap: {},
      lastDeployed: null,
      deploymentCount: 0
    };
  }

  // ---------- Manifest Building ----------

  async buildManifestFromFiles(fileIds, entryPoint = 'index.html') {
    const manifest = {
      manifest: "arweave/paths",
      version: "0.2.0", // Fixed Arweave manifest specification version
      index: { path: entryPoint },
      paths: {}
    };

    // Add all files to paths
    for (const [filePath, txId] of Object.entries(fileIds)) {
      const relativePath = path.relative(this.appPath, filePath);
      manifest.paths[relativePath] = { id: txId };
    }

    return manifest;
  }

  async getCurrentVersion() {
    try {
      const manifest = await this.loadManifest();
      return manifest.version || "0.1.0";
    } catch {
      return "0.1.0";
    }
  }

  incrementVersion(currentVersion) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  // ---------- File Discovery ----------

  async discoverAppFiles() {
    const files = [];
    
    if (!(await isDirectory(this.appPath))) {
      throw new Error(`App path does not exist: ${this.appPath}`);
    }

    const allFiles = await getAllFilesInDirectory(this.appPath);
    
    for (const file of allFiles) {
      // Skip manifest and tracker files
      if (file.name === 'manifest.json' || file.name === 'deployment-tracker.json') {
        continue;
      }
      
      // Only include deployable file types
      if (this.isDeployableFile(file.absolutePath)) {
        files.push(file.absolutePath);
      }
    }

    return files;
  }

  isDeployableFile(filePath) {
    const deployableExtensions = ['.html', '.css', '.js', '.txt', '.json', '.md', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico'];
    const ext = path.extname(filePath).toLowerCase();
    return deployableExtensions.includes(ext);
  }

  // ---------- Change Detection Helpers ----------

  async getLastDeployCommit() {
    const tracker = await this.loadDeploymentTracker();
    return tracker.lastDeployCommit;
  }

  async getChangedFilesByHash(gitTracker) {
    console.log(`🔍 Using hash-based change detection...`);
    
    // Get all current app files
    const allFiles = await this.discoverAppFiles();
    
    // Filter to only git-tracked files (safety check for local runs)
    const trackedFiles = [];
    for (const file of allFiles) {
      if (await gitTracker.isFileTracked(file)) {
        trackedFiles.push(file);
      }
    }
    
    const changedFiles = [];
    
    // Load stored file hashes from deployment tracker
    const tracker = await this.loadDeploymentTracker();
    const storedHashes = tracker.fileHashes || {};
    
    // Check each file for changes
    for (const filePath of trackedFiles) {
      const relativePath = path.relative(this.appPath, filePath);
      
      // Get current file hash
      const currentHash = await gitTracker.getFileHash(filePath);
      const storedHash = storedHashes[relativePath];
      
      if (!storedHash || currentHash !== storedHash) {
        changedFiles.push(filePath);
        console.log(`📝 File changed: ${relativePath} (${storedHash ? 'modified' : 'new'})`);
      }
    }
    
    // Check for deleted files (files in stored hashes but not in current tracked files)
    const currentRelativePaths = trackedFiles.map(f => path.relative(this.appPath, f));
    for (const relativePath of Object.keys(storedHashes)) {
      if (!currentRelativePaths.includes(relativePath)) {
        console.log(`🗑️ File deleted: ${relativePath}`);
        // Note: We don't add deleted files to changedFiles since we can't upload them
        // The manifest will be updated to remove them in updateManifestWithNewFiles
      }
    }
    
    return { changedFiles, currentFiles: trackedFiles };
  }

  async updateDeploymentTracker(commitHash, manifestTxId, changedFiles, fileHashes = {}) {
    const tracker = await this.loadDeploymentTracker();
    
    // Update tracking data
    tracker.lastDeployCommit = commitHash;
    tracker.lastDeployed = new Date().toISOString();
    tracker.deploymentCount = (tracker.deploymentCount || 0) + 1;
    
    // Add to deployment history
    tracker.deploymentHistory.push({
      version: await this.getCurrentVersion(),
      commit: commitHash,
      manifestTxId: manifestTxId,
      changedFiles: changedFiles,
      deployed: tracker.lastDeployed
    });
    
    // Keep only last 10 deployments in history
    if (tracker.deploymentHistory.length > 10) {
      tracker.deploymentHistory = tracker.deploymentHistory.slice(-10);
    }
    
    // Update file commit map
    for (const file of changedFiles) {
      const relativePath = path.relative(this.appPath, file);
      tracker.fileCommitMap[relativePath] = commitHash;
    }
    
    // Update file hashes (for hash-based change detection)
    if (Object.keys(fileHashes).length > 0) {
      tracker.fileHashes = { ...tracker.fileHashes, ...fileHashes };
    }
    
    await this.saveDeploymentTracker(tracker);
    return tracker;
  }

  // ---------- Utility Methods ----------

  async getEntryPoint() {
    const possibleEntryPoints = [
      'index.html',
      'main.html', 
      'app.html',
      'index.js',
      'main.js',
      'app.js',
      'index.txt'
    ];
    
    for (const entry of possibleEntryPoints) {
      const entryPath = path.join(this.appPath, entry);
      if (await fileExists(entryPath)) {
        return entry;
      }
    }
    
    // Fallback to first file
    const files = await this.discoverAppFiles();
    if (files.length > 0) {
      return path.relative(this.appPath, files[0]);
    }
    
    throw new Error(`No entry point found for app ${this.appId}`);
  }

  async getAppInfo() {
    const manifest = await this.loadManifest();
    const tracker = await this.loadDeploymentTracker();
    
    return {
      appId: this.appId,
      version: manifest.version,
      entryPoint: manifest.index?.path,
      fileCount: Object.keys(manifest.paths).length,
      lastDeployed: tracker.lastDeployed,
      deploymentCount: tracker.deploymentCount,
      lastDeployCommit: tracker.lastDeployCommit
    };
  }
}
