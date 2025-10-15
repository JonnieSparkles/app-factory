// Git operations for deployment versioning
// Handles basic git operations for commit information and file hashing

import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

export class GitTracker {
  constructor(appId, appPath) {
    this.appId = appId;
    this.appPath = appPath;
    this.appRelativePath = path.relative(process.cwd(), appPath);
    this.dir = process.cwd();
  }

  // ---------- Commit Information ----------

  async getCurrentCommitHash() {
    try {
      const hash = await git.resolveRef({ fs, dir: this.dir, ref: 'HEAD' });
      return hash;
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
      const hash = commitHash || await this.getCurrentCommitHash();
      const commit = await git.readCommit({ fs, dir: this.dir, oid: hash });
      return commit.commit.message;
    } catch (error) {
      return 'Unknown commit';
    }
  }

  async getCommitInfo(commitHash = null) {
    try {
      const hash = commitHash || await this.getCurrentCommitHash();
      const commit = await git.readCommit({ fs, dir: this.dir, oid: hash });
      
      return {
        fullHash: commit.oid,
        shortHash: commit.oid.substring(0, 16),
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: new Date(commit.commit.author.timestamp * 1000)
      };
    } catch (error) {
      return {
        fullHash: commitHash || 'unknown',
        shortHash: (commitHash || 'unknown').substring(0, 16),
        message: 'Unknown commit',
        author: 'Unknown',
        date: new Date()
      };
    }
  }

  // ---------- File Operations ----------

  async getAllAppFiles() {
    try {
      const files = await git.listFiles({ fs, dir: this.dir });
      
      const appFiles = files
        .filter(file => file.startsWith(this.appRelativePath))
        .map(file => path.resolve(this.dir, file))
        .filter(file => !this.isTrackingFile(file));
      
      // Filter out directories
      const deployableFiles = [];
      for (const file of appFiles) {
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
      const content = await fs.promises.readFile(filePath);
      const hash = await git.hashBlob({ object: content });
      // hashBlob returns an object with oid property - we need just the hash string
      return typeof hash === 'string' ? hash : hash.oid || hash;
    } catch (error) {
      throw new Error(`Failed to get file hash for ${filePath}: ${error.message}`);
    }
  }

  async isFileTracked(filePath) {
    try {
      const relativePath = path.relative(this.dir, filePath);
      const files = await git.listFiles({ fs, dir: this.dir });
      return files.includes(relativePath) || files.includes(relativePath.replace(/\\/g, '/'));
    } catch {
      return false;
    }
  }

  async isDeployableFile(filePath) {
    try {
      const stat = await fs.promises.stat(filePath);
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
      await git.findRoot({ fs, filepath: this.dir });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRepositoryInfo() {
    try {
      const remoteUrl = await git.getConfig({ fs, dir: this.dir, path: 'remote.origin.url' });
      const branch = await git.currentBranch({ fs, dir: this.dir });
      
      return {
        remoteUrl: remoteUrl || null,
        branch: branch || null,
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
      const logs = await git.log({ fs, dir: this.dir, depth: 100 });
      
      for (const commit of logs) {
        if (commit.commit.message.includes(`Deploy app:${this.appId}`)) {
          return commit.oid;
        }
      }
      
      return null; // No previous deployment found
    } catch (error) {
      return null;
    }
  }

  async getDeploymentHistory(limit = 10) {
    try {
      const logs = await git.log({ fs, dir: this.dir, depth: 100 });
      
      const deployments = [];
      for (const commit of logs) {
        if (commit.commit.message.includes(`Deploy app:${this.appId}`)) {
          deployments.push({
            commitHash: commit.oid,
            message: commit.commit.message
          });
          
          if (deployments.length >= limit) {
            break;
          }
        }
      }

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
      await git.add({ 
        fs, 
        dir: this.dir, 
        filepath: `${this.appRelativePath}/manifest.json` 
      });
      await git.add({ 
        fs, 
        dir: this.dir, 
        filepath: `${this.appRelativePath}/deployment-tracker.json` 
      });
      
      // Get author info or use defaults
      let authorName = await git.getConfig({ fs, dir: this.dir, path: 'user.name' }) || 'Deployment Bot';
      let authorEmail = await git.getConfig({ fs, dir: this.dir, path: 'user.email' }) || 'deploy@agent-tests.com';
      
      // Create commit
      const commitHash = await git.commit({
        fs,
        dir: this.dir,
        author: {
          name: authorName,
          email: authorEmail
        },
        message: commitMessage
      });
      
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
      
      await git.tag({
        fs,
        dir: this.dir,
        ref: tagName,
        object: commitHash,
        force: false,
        tagger: {
          name: await git.getConfig({ fs, dir: this.dir, path: 'user.name' }) || 'Deployment Bot',
          email: await git.getConfig({ fs, dir: this.dir, path: 'user.email' }) || 'deploy@agent-tests.com',
          timestamp: Math.floor(Date.now() / 1000)
        }
      });
      
      return tagName;
    } catch (error) {
      throw new Error(`Failed to create deployment tag: ${error.message}`);
    }
  }
}
