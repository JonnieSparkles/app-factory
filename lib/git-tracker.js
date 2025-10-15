// Git operations for deployment versioning
// Handles basic git operations for commit information and file hashing

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export class GitTracker {
  constructor(appId, appPath) {
    this.appId = appId;
    this.appPath = appPath;
    this.appRelativePath = path.relative(process.cwd(), appPath);
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

  // ---------- File Operations ----------

  async getAllAppFiles() {
    try {
      const command = `git ls-files ${this.appRelativePath}`;
      const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
      
      if (!output.trim()) {
        return [];
      }

      const allFiles = output.trim().split('\n')
        .map(file => path.resolve(process.cwd(), file))
        .filter(file => !this.isTrackingFile(file));
      
      // Filter out directories (git ls-files can return directories)
      const deployableFiles = [];
      for (const file of allFiles) {
        if (await this.isDeployableFile(file)) {
          deployableFiles.push(file);
        }
      }

      return deployableFiles;
    } catch (error) {
      throw new Error(`Failed to get all app files: ${error.message}`);
    }
  }

  async getFileHash(filePath) {
    try {
      const output = execSync(`git hash-object ${filePath}`, { encoding: 'utf8', cwd: process.cwd() });
      return output.trim();
    } catch (error) {
      throw new Error(`Failed to get file hash for ${filePath}: ${error.message}`);
    }
  }

  async isFileTracked(filePath) {
    try {
      // ls-files --error-unmatch exits with error if file is not tracked
      execSync(`git ls-files --error-unmatch "${filePath}"`, { 
        encoding: 'utf8', 
        cwd: process.cwd(),
        stdio: 'pipe'  // suppress output
      });
      return true;
    } catch {
      return false;
    }
  }

  async isDeployableFile(filePath) {
    try {
      const stat = await fs.stat(filePath);
      return !stat.isDirectory();
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        console.warn(`⚠️ Permission denied accessing ${filePath} - skipping`);
        return false; // Skip files we can't access
      }
      // For other errors (file not found, etc.), also skip
      return false;
    }
  }

  isTrackingFile(filePath) {
    const fileName = path.basename(filePath);
    return fileName === 'manifest.json' || fileName === 'deployment-tracker.json';
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
