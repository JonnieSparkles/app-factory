// Git-based change detection for incremental deployment
// Handles finding changed files between commits and deployments

import { execSync } from 'child_process';
import { readFile, fileExists } from './utils.js';
import path from 'path';

export class GitTracker {
  constructor(appId, appPath) {
    this.appId = appId;
    this.appPath = appPath;
    this.appRelativePath = path.relative(process.cwd(), appPath);
  }

  // ---------- Change Detection ----------

  async getChangedFilesSinceCommit(commitHash, useHashing = false) {
    try {
      if (!commitHash) {
        // First deployment - return all files
        return await this.getAllAppFiles();
      }

      if (useHashing) {
        // Use file hashing for more reliable change detection
        return await this.getChangedFilesByHashing(commitHash);
      }

      // Use git-based detection (default, faster)
      // First check if the commit exists
      try {
        execSync(`git cat-file -e ${commitHash}`, { encoding: 'utf8', cwd: process.cwd() });
      } catch (commitError) {
        // Commit not found, treat as first deployment
        console.log(`⚠️ Commit ${commitHash} not found, treating as first deployment`);
        return await this.getAllAppFiles();
      }

      // Get the actual changes in the current commit, not since the last deployment
      // This ensures we only deploy files that were actually changed in the current commit
      const currentCommit = await this.getCurrentCommitHash();
      
      // If the last deployment commit is not in the current branch history, 
      // we need to find the actual changes in the current commit
      try {
        // Check if the last deployment commit is in the current branch history
        execSync(`git merge-base --is-ancestor ${commitHash} ${currentCommit}`, { encoding: 'utf8', cwd: process.cwd() });
        
        // If we get here, the commit is in the history, so we can do a normal diff
        const command = `git diff --name-only ${commitHash} ${currentCommit} -- ${this.appRelativePath}`;
        const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
        
        if (!output.trim()) {
          return []; // No changes
        }

        const changedFiles = output.trim().split('\n')
          .map(file => path.resolve(process.cwd(), file))
          .filter(file => {
            const normalizedFile = file.replace(/\\/g, '/');
            const normalizedAppPath = this.appPath.replace(/\\/g, '/');
            return normalizedFile.includes(normalizedAppPath);
          })
          .filter(file => this.isDeployableFile(file))
          .filter(file => !this.isTrackingFile(file));

        return changedFiles;
      } catch (mergeBaseError) {
        // The last deployment commit is not in the current branch history
        // This often happens with merge commits. Let's be smarter about detecting changes.
        console.log(`⚠️ Last deployment commit ${commitHash} not in current branch history`);
        console.log(`🔍 Analyzing merge commit for actual changes...`);
        
        // Check if current commit is a merge commit
        const isMergeCommit = execSync(`git cat-file -p ${currentCommit} | grep "^parent " | wc -l`, { encoding: 'utf8', cwd: process.cwd() }).trim();
        
        if (isMergeCommit === '2') {
          // This is a merge commit - get the actual changes from the merge
          console.log(`🔍 Detected merge commit, analyzing merge changes...`);
          
          // Get the merge parents
          const parents = execSync(`git cat-file -p ${currentCommit} | grep "^parent " | cut -d' ' -f2`, { encoding: 'utf8', cwd: process.cwd() }).trim().split('\n');
          const mainParent = parents[0]; // First parent is usually main
          const featureParent = parents[1]; // Second parent is the feature branch
          
          // Get changes between main parent and the merge commit (this gives us the actual changes)
          const command = `git diff --name-only ${mainParent} ${currentCommit} -- ${this.appRelativePath}`;
          const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
          
          if (!output.trim()) {
            console.log(`🔍 No changes detected in merge commit`);
            return []; // No changes
          }

          const changedFiles = output.trim().split('\n')
            .map(file => path.resolve(process.cwd(), file))
            .filter(file => {
              const normalizedFile = file.replace(/\\/g, '/');
              const normalizedAppPath = this.appPath.replace(/\\/g, '/');
              return normalizedFile.includes(normalizedAppPath);
            })
            .filter(file => this.isDeployableFile(file))
            .filter(file => !this.isTrackingFile(file));

          console.log(`🔍 Found ${changedFiles.length} changed files in merge commit`);
          return changedFiles;
        } else {
          // Regular commit - get changes from parent
          console.log(`🔍 Regular commit, checking changes from parent...`);
          
          // Get the parent commit of the current commit
          const parentCommit = execSync(`git rev-parse ${currentCommit}^`, { encoding: 'utf8', cwd: process.cwd() }).trim();
          
          // Get changes between parent and current commit
          const command = `git diff --name-only ${parentCommit} ${currentCommit} -- ${this.appRelativePath}`;
          const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
          
          if (!output.trim()) {
            return []; // No changes
          }

          const changedFiles = output.trim().split('\n')
            .map(file => path.resolve(process.cwd(), file))
            .filter(file => {
              const normalizedFile = file.replace(/\\/g, '/');
              const normalizedAppPath = this.appPath.replace(/\\/g, '/');
              return normalizedFile.includes(normalizedAppPath);
            })
            .filter(file => this.isDeployableFile(file))
            .filter(file => !this.isTrackingFile(file));

          return changedFiles;
        }
      }
    } catch (error) {
      if (error.message.includes('bad revision')) {
        // Commit not found, treat as first deployment
        console.log(`⚠️ Commit ${commitHash} not found, treating as first deployment`);
        return await this.getAllAppFiles();
      }
      throw new Error(`Git change detection failed: ${error.message}`);
    }
  }

  async getChangedFilesByHashing(commitHash) {
    console.log(`🔍 Using file hashing for change detection...`);
    
    // Get all current files
    const currentFiles = await this.getAllAppFiles();
    const changedFiles = [];
    
    // Load stored file hashes from deployment tracker
    const trackerPath = path.join(this.appPath, 'deployment-tracker.json');
    let storedHashes = {};
    
    try {
      if (await fileExists(trackerPath)) {
        const trackerData = await readFile(trackerPath);
        const tracker = JSON.parse(trackerData);
        storedHashes = tracker.fileHashes || {};
      }
    } catch (error) {
      console.log(`⚠️ Could not load stored hashes: ${error.message}`);
    }
    
    // Check each file for changes
    for (const filePath of currentFiles) {
      const relativePath = path.relative(this.appPath, filePath);
      
      // Skip tracking files
      if (this.isTrackingFile(filePath)) {
        continue;
      }
      
      const currentHash = await this.getFileHash(filePath);
      const storedHash = storedHashes[relativePath];
      
      if (!storedHash || currentHash !== storedHash) {
        changedFiles.push(filePath);
        console.log(`📝 File changed: ${relativePath} (${storedHash ? 'modified' : 'new'})`);
      }
    }
    
    // Check for deleted files (files in stored hashes but not in current files)
    const currentRelativePaths = currentFiles.map(f => path.relative(this.appPath, f));
    for (const [relativePath, storedHash] of Object.entries(storedHashes)) {
      if (!currentRelativePaths.includes(relativePath)) {
        console.log(`🗑️ File deleted: ${relativePath}`);
        // Note: We don't add deleted files to changedFiles since we can't upload them
        // The manifest will be updated to remove them
      }
    }
    
    return changedFiles;
  }

  async getChangedFilesSinceLastDeploy(lastDeployCommit, useHashing = false) {
    return await this.getChangedFilesSinceCommit(lastDeployCommit, useHashing);
  }

  async getAllAppFiles() {
    try {
      const command = `git ls-files ${this.appRelativePath}`;
      const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
      
      if (!output.trim()) {
        return [];
      }

      const allFiles = output.trim().split('\n')
        .map(file => path.resolve(process.cwd(), file))
        .filter(file => this.isDeployableFile(file))
        .filter(file => !this.isTrackingFile(file));

      return allFiles;
    } catch (error) {
      throw new Error(`Failed to get all app files: ${error.message}`);
    }
  }

  // ---------- Commit Information ----------

  async getCurrentCommitHash() {
    try {
      const output = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: process.cwd() });
      return output.trim();
    } catch (error) {
      throw new Error(`Failed to get current commit hash: ${error.message}`);
    }
  }

  async getShortCommitHash() {
    const fullHash = await this.getCurrentCommitHash();
    return fullHash.substring(0, 16);
  }

  async getCommitMessage(commitHash = null) {
    try {
      const hash = commitHash || 'HEAD';
      const output = execSync(`git log --format=%s -n 1 ${hash}`, { encoding: 'utf8', cwd: process.cwd() });
      return output.trim();
    } catch (error) {
      return 'Unknown commit';
    }
  }

  async getCommitInfo(commitHash = null) {
    try {
      const hash = commitHash || 'HEAD';
      const output = execSync(`git log --format="%H|%s|%an|%ad" -n 1 ${hash}`, { encoding: 'utf8', cwd: process.cwd() });
      const [fullHash, message, author, date] = output.trim().split('|');
      
      return {
        fullHash,
        shortHash: fullHash.substring(0, 16),
        message,
        author,
        date: new Date(date)
      };
    } catch (error) {
      return {
        fullHash: hash || 'unknown',
        shortHash: (hash || 'unknown').substring(0, 16),
        message: 'Unknown commit',
        author: 'Unknown',
        date: new Date()
      };
    }
  }

  // ---------- Deployment History ----------

  async findLastDeployCommit() {
    try {
      // Look for deployment commit messages
      const command = `git log --grep="Deploy app:${this.appId}" --oneline -n 1`;
      const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
      
      if (!output.trim()) {
        return null; // No previous deployment found
      }

      const commitHash = output.trim().split(' ')[0];
      return commitHash;
    } catch (error) {
      return null;
    }
  }

  async getDeploymentHistory(limit = 10) {
    try {
      const command = `git log --grep="Deploy app:${this.appId}" --oneline -n ${limit}`;
      const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
      
      if (!output.trim()) {
        return [];
      }

      const deployments = output.trim().split('\n').map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          commitHash: hash,
          message: messageParts.join(' ')
        };
      });

      return deployments;
    } catch (error) {
      return [];
    }
  }

  // ---------- File Operations ----------

  isDeployableFile(filePath) {
    const deployableExtensions = ['.html', '.css', '.js', '.txt', '.json', '.md', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico'];
    const ext = path.extname(filePath).toLowerCase();
    return deployableExtensions.includes(ext);
  }

  isTrackingFile(filePath) {
    const fileName = path.basename(filePath);
    return fileName === 'manifest.json' || fileName === 'deployment-tracker.json';
  }

  async getFileHash(filePath) {
    try {
      const output = execSync(`git hash-object ${filePath}`, { encoding: 'utf8', cwd: process.cwd() });
      return output.trim();
    } catch (error) {
      throw new Error(`Failed to get file hash for ${filePath}: ${error.message}`);
    }
  }

  async getFileStatus(filePath) {
    try {
      const output = execSync(`git status --porcelain ${filePath}`, { encoding: 'utf8', cwd: process.cwd() });
      return output.trim();
    } catch (error) {
      return 'unknown';
    }
  }

  // ---------- Repository Information ----------

  async isGitRepository() {
    try {
      execSync('git rev-parse --git-dir', { encoding: 'utf8', cwd: process.cwd() });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRepositoryInfo() {
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8', cwd: process.cwd() }).trim();
      const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: process.cwd() }).trim();
      
      return {
        remoteUrl,
        branch,
        isGitRepo: true
      };
    } catch (error) {
      return {
        remoteUrl: null,
        branch: null,
        isGitRepo: false
      };
    }
  }

  // ---------- Utility Methods ----------

  async createDeployCommit(manifestTxId, changedFiles, version) {
    try {
      const commitMessage = this.formatDeployCommitMessage(version, changedFiles, manifestTxId);
      
      // Stage the manifest and tracker files
      execSync(`git add ${this.appRelativePath}/manifest.json ${this.appRelativePath}/deployment-tracker.json`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      // Create commit with temporary identity if needed
      try {
        execSync(`git commit -m "${commitMessage}"`, { 
          encoding: 'utf8', 
          cwd: process.cwd() 
        });
      } catch (commitError) {
        // If commit fails due to missing identity, set it temporarily and retry
        if (commitError.message.includes('Author identity unknown')) {
          console.log(`⚠️ Git identity not configured, setting temporary identity...`);
          execSync(`git config user.email "deploy@agent-tests.com"`, { 
            encoding: 'utf8', 
            cwd: process.cwd() 
          });
          execSync(`git config user.name "Deployment Bot"`, { 
            encoding: 'utf8', 
            cwd: process.cwd() 
          });
          execSync(`git commit -m "${commitMessage}"`, { 
            encoding: 'utf8', 
            cwd: process.cwd() 
          });
        } else {
          throw commitError;
        }
      }
      
      const commitHash = await this.getCurrentCommitHash();
      return commitHash;
    } catch (error) {
      throw new Error(`Failed to create deployment commit: ${error.message}`);
    }
  }

  formatDeployCommitMessage(version, changedFiles, manifestTxId) {
    const fileList = changedFiles.map(f => path.relative(this.appPath, f)).join(', ');
    const shortTxId = manifestTxId.substring(0, 16);
    
    return `Deploy app:${this.appId} v${version}

Files changed: ${fileList}
Manifest: ${shortTxId}...
ArNS: ${this.appId}`;
  }

  async createDeployTag(version, commitHash) {
    try {
      const tagName = `deploy-${this.appId}-v${version}`;
      execSync(`git tag -a "${tagName}" ${commitHash} -m "Deploy ${this.appId} v${version}"`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      return tagName;
    } catch (error) {
      throw new Error(`Failed to create deployment tag: ${error.message}`);
    }
  }
}
