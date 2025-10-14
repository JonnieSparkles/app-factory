# Incremental Deployment Scenarios and Edge Cases Analysis

**Document Version:** 1.0  
**Analysis Date:** October 14, 2025  
**System:** Arweave Incremental Deployment System with Hash-Based Change Detection

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Deployment Flow](#core-deployment-flow)
3. [New App Deployment (Base Case)](#new-app-deployment-base-case)
4. [Happy Path Scenario](#happy-path-scenario)
5. [Edge Cases & Special Scenarios](#edge-cases--special-scenarios)
6. [Error Handling & Recovery](#error-handling--recovery)
7. [CI/CD Specific Behaviors](#cicd-specific-behaviors)
8. [Data Integrity & State Management](#data-integrity--state-management)
9. [Security Considerations](#security-considerations)
10. [Performance Characteristics](#performance-characteristics)
11. [Recommendations](#recommendations)

---

## System Overview

### Architecture Components

The incremental deployment system consists of the following key components:

1. **IncrementalDeployer** (`lib/incremental-deploy.js`)
   - Orchestrates the entire deployment process
   - Manages file uploads and manifest updates
   - Creates ArNS records and deployment commits

2. **ManifestManager** (`lib/manifest-manager.js`)
   - Manages per-app manifest.json files (Arweave transaction IDs)
   - Handles deployment-tracker.json (file hashes and metadata)
   - Implements hash-based change detection

3. **GitTracker** (`lib/git-tracker.js`)
   - Provides git operations (commit info, file hashing, file tracking)
   - Calculates SHA-256 hashes using `git hash-object`
   - Manages deployment commits and history

4. **ArweaveUploader** (`lib/arweave.js`)
   - Uploads files to Arweave via Turbo SDK
   - Manages wallet and authentication

5. **ArNS Manager** (`lib/arns.js`)
   - Creates and updates ArNS undernames
   - Maps commit hashes to manifest transaction IDs

### Key Files

Each app directory contains:
- **manifest.json**: Arweave manifest with transaction IDs for all files
- **deployment-tracker.json**: File hashes, deployment history, and metadata
- **[app files]**: Actual application files (HTML, CSS, JS, etc.)

### Change Detection Strategy

The system uses **hash-based change detection** as the sole mechanism:
- Files are hashed using `git hash-object` (SHA-256)
- Current hashes are compared with stored hashes in deployment-tracker.json
- Only files with different hashes are uploaded
- Works with shallow git clones (fetch-depth: 1)
- Independent of git history or merge commits

---

## Core Deployment Flow

### Deployment Sequence

```
1. Validate git repository
   ↓
2. Get current commit info (hash, message, author, date)
   ↓
3. Load deployment tracker (last commit, file hashes)
   ↓
4. Discover all app files in directory
   ↓
5. Filter to git-tracked files only
   ↓
6. Calculate current hash for each file (git hash-object)
   ↓
7. Compare with stored hashes → identify changed files
   ↓
8. Upload changed files to Arweave
   ↓
9. Load current manifest.json
   ↓
10. Update manifest with new transaction IDs
    ↓
11. Remove deleted files from manifest
    ↓
12. Upload updated manifest to Arweave
    ↓
13. Create ArNS record (commit_hash → manifest_txid)
    ↓
14. Update deployment tracker with new hashes
    ↓
15. Save updated manifest locally
    ↓
16. Create deployment commit (manifest + tracker)
    ↓
17. Return deployment result
```

### File Hashing Process

```javascript
// GitTracker.getFileHash()
git hash-object path/to/file.html
// Returns: caec3826ccfb35618dc56489b7902f97a3aa424d

// Stored in deployment-tracker.json:
"fileHashes": {
  "index.html": "caec3826ccfb35618dc56489b7902f97a3aa424d",
  "style.css": "22153922a682a2a2e37a0f5d89caca9a87c160d6"
}
```

### Manifest Update Process

```javascript
// Current manifest
{
  "paths": {
    "index.html": { "id": "old-txid-123" },
    "style.css": { "id": "old-txid-456" },
    "app.js": { "id": "old-txid-789" }
  }
}

// Changed files: index.html (new hash)
// New uploads: { "index.html": "new-txid-abc" }

// Updated manifest
{
  "paths": {
    "index.html": { "id": "new-txid-abc" },  // Updated
    "style.css": { "id": "old-txid-456" },   // Unchanged
    "app.js": { "id": "old-txid-789" }       // Unchanged
  }
}
```

---

## New App Deployment (Base Case)

### Scenario Description

A developer creates a brand new app and deploys it for the first time - no deployment history, no manifest, no tracker files exist.

### Pre-conditions

- New app directory created with files
- No `manifest.json` exists
- No `deployment-tracker.json` exists
- No previous deployment history
- Git repository is clean and configured
- All files are tracked by git

### Steps

1. **Developer creates new app**
   ```
   apps/brand-new-app/
   ├── index.html
   ├── style.css
   ├── app.js
   └── assets/
       ├── logo.png
       └── icon.svg
   # No manifest.json
   # No deployment-tracker.json
   ```

2. **Commit initial files**
   ```bash
   git add apps/brand-new-app/
   git commit -m "Initial commit: brand new app"
   # Commit: f1e2d3c4b5a6978
   ```

3. **Trigger first deployment**
   ```bash
   node deploy.js --file apps/brand-new-app/
   ```

4. **System execution**
   ```
   🚀 Starting incremental deployment for app: brand-new-app
   📝 Current commit: f1e2d3c4b5a6978 - Initial commit: brand new app
   🔍 Last deployment commit: none (first deployment)
   🔍 Using hash-based change detection...
   📝 File changed: index.html (new)
   📝 File changed: style.css (new)
   📝 File changed: app.js (new)
   📝 File changed: assets/logo.png (new)
   📝 File changed: assets/icon.svg (new)
   📁 Changed files: 5
   📤 Uploading 5 changed files...
   [1/5] Uploading index.html...
   ✅ Uploaded: txid-index-abc123
   [2/5] Uploading style.css...
   ✅ Uploaded: txid-style-def456
   [3/5] Uploading app.js...
   ✅ Uploaded: txid-app-ghi789
   [4/5] Uploading assets/logo.png...
   ✅ Uploaded: txid-logo-jkl012
   [5/5] Uploading assets/icon.svg...
   ✅ Uploaded: txid-icon-mno345
   📋 Creating new manifest with 5 file IDs
   ☁️ Uploading manifest to Arweave...
   ✅ Manifest uploaded: manifest-txid-xyz789
   🔗 Creating ArNS record: f1e2d3c4b5a6978 → manifest-txid-xyz789
   ✅ ArNS record created
   📝 Created deployment commit
   🎉 Incremental deployment complete!
   ```

5. **Result**
   - All 5 files uploaded to Arweave
   - New manifest created with all transaction IDs
   - ArNS record maps commit hash to manifest
   - deployment-tracker.json created with all file hashes
   - Deployment commit created automatically

### Files Created

**apps/brand-new-app/manifest.json**
```json
{
  "manifest": "arweave/paths",
  "version": "0.2.0",
  "index": { "path": "index.html" },
  "paths": {
    "index.html": { "id": "txid-index-abc123" },
    "style.css": { "id": "txid-style-def456" },
    "app.js": { "id": "txid-app-ghi789" },
    "assets/logo.png": { "id": "txid-logo-jkl012" },
    "assets/icon.svg": { "id": "txid-icon-mno345" }
  }
}
```

**apps/brand-new-app/deployment-tracker.json**
```json
{
  "version": "1.0.0",
  "lastDeployCommit": "f1e2d3c4b5a6978",
  "lastDeployed": "2025-10-14T12:00:00.000Z",
  "deploymentCount": 1,
  "fileHashes": {
    "index.html": "hash-index-abc123",
    "style.css": "hash-style-def456",
    "app.js": "hash-app-ghi789",
    "assets/logo.png": "hash-logo-jkl012",
    "assets/icon.svg": "hash-icon-mno345"
  },
  "recentDeployments": [
    {
      "commit": "f1e2d3c4b5a6978",
      "manifestTxId": "manifest-txid-xyz789",
      "changedFiles": ["index.html", "style.css", "app.js", "assets/logo.png", "assets/icon.svg"],
      "deployed": "2025-10-14T12:00:00.000Z"
    }
  ]
}
```

### Access

The app is accessible at:
- `https://f1e2d3c4b5a6978_owner-name.arweave.dev`
- Resolves to manifest `manifest-txid-xyz789`
- Serves all files with their transaction IDs

### Key Characteristics

- **All files uploaded** - no previous state to compare against
- **New manifest created** - not updating existing one
- **Tracker initialized** - first deployment count = 1
- **Entry point detected** - automatically finds index.html
- **Full deployment cost** - no incremental savings on first deploy
- **Foundation for future incremental deployments** - sets up tracking system

---

## Happy Path Scenario

### Scenario Description

A developer makes changes to 2 files in an existing app and triggers deployment.

### Pre-conditions

- App has been deployed before
- deployment-tracker.json exists with file hashes
- manifest.json exists with current transaction IDs
- Git repository is clean and configured
- All files are tracked by git

### Steps

1. **Developer modifies files**
   ```
   Modified: apps/my-app/index.html
   Modified: apps/my-app/style.css
   Unchanged: apps/my-app/app.js (50 other files)
   ```

2. **Commit changes**
   ```bash
   git add apps/my-app/
   git commit -m "Update homepage design"
   # Commit: a1b2c3d4e5f6g7h8i9j0
   ```

3. **Trigger deployment**
   ```bash
   node deploy.js --file apps/my-app/
   ```

4. **System execution**
   ```
   🚀 Starting incremental deployment for app: my-app
   📝 Current commit: a1b2c3d4e5f6g7h8 - Update homepage design
   🔍 Last deployment commit: x9y8z7w6v5u4t3s2
   🔍 Using hash-based change detection...
   📝 File changed: index.html (modified)
   📝 File changed: style.css (modified)
   📁 Changed files: 2
   📤 Uploading 2 changed files...
   [1/2] Uploading index.html...
   ✅ Uploaded: new-txid-index-abc
   [2/2] Uploading style.css...
   ✅ Uploaded: new-txid-style-def
   📋 Updated manifest with 2 new file IDs
   ☁️ Uploading manifest to Arweave...
   ✅ Manifest uploaded: manifest-txid-xyz
   🔗 Creating ArNS record: a1b2c3d4e5f6g7h8 → manifest-txid-xyz
   ✅ ArNS record created
   📝 Created deployment commit
   🎉 Incremental deployment complete!
   ```

5. **Result**
   - Only 2 files uploaded (not all 52 files)
   - Cost savings: 96%
   - Manifest updated with new transaction IDs
   - ArNS record maps commit hash to manifest
   - deployment-tracker.json updated with new hashes
   - Deployment commit created automatically

### Files Updated

**apps/my-app/manifest.json**
```json
{
  "manifest": "arweave/paths",
  "version": "0.2.0",
  "index": { "path": "index.html" },
  "paths": {
    "index.html": { "id": "new-txid-index-abc" },
    "style.css": { "id": "new-txid-style-def" },
    "app.js": { "id": "old-txid-unchanged" }
  }
}
```

**apps/my-app/deployment-tracker.json**
```json
{
  "version": "1.0.0",
  "lastDeployCommit": "a1b2c3d4e5f6g7h8",
  "lastDeployed": "2025-10-14T12:00:00.000Z",
  "deploymentCount": 5,
  "fileHashes": {
    "index.html": "new-hash-abc123",
    "style.css": "new-hash-def456",
    "app.js": "old-hash-unchanged"
  },
  "recentDeployments": [
    {
      "commit": "a1b2c3d4e5f6g7h8",
      "manifestTxId": "manifest-txid-xyz",
      "changedFiles": ["index.html", "style.css"],
      "deployed": "2025-10-14T12:00:00.000Z"
    }
  ]
}
```

### Access

The app is accessible at:
- `https://a1b2c3d4e5f6g7h8_owner-name.arweave.dev`
- Resolves to manifest `manifest-txid-xyz`
- Serves files with updated transaction IDs

---

## Edge Cases & Special Scenarios

### 1. Deleting a File

**Scenario:** A file is deleted from the app directory

#### Behavior

```javascript
// Previous state
apps/my-app/
├── index.html
├── style.css
└── old-feature.js  ← Will be deleted

// Developer action
rm apps/my-app/old-feature.js
git add -A
git commit -m "Remove old feature"

// Deployment process
```

#### Detection Logic

```javascript
// ManifestManager.getChangedFilesByHash()
const currentRelativePaths = trackedFiles.map(f => path.relative(this.appPath, f));
for (const relativePath of Object.keys(storedHashes)) {
  if (!currentRelativePaths.includes(relativePath)) {
    console.log(`🗑️ File deleted: ${relativePath}`);
    // Note: Deleted files NOT added to changedFiles
  }
}
```

#### Manifest Update

```javascript
// ManifestManager.updateManifestWithNewFiles()
const currentRelativePaths = new Set(
  currentFiles.map(f => path.relative(this.appPath, f))
);

const cleanedPaths = {};
for (const [relativePath, fileData] of Object.entries(updatedManifest.paths)) {
  if (currentRelativePaths.has(relativePath)) {
    cleanedPaths[relativePath] = fileData;  // Keep existing files
  }
  // Deleted files are omitted
}
```

#### Result

- **Deleted file removed from manifest.json**
- **Deleted file hash removed from deployment-tracker.json**
- **No upload attempted for deleted file** (can't upload what doesn't exist)
- **Manifest updated and re-uploaded** to reflect removal
- **ArNS record points to new manifest** without the deleted file
- **Old transaction ID remains on Arweave** but no longer referenced

#### Edge Case: Deleted File Still in Tracker

If deployment fails partway:
- File is deleted locally
- But deployment-tracker.json still has its hash
- Next deployment will detect it as deleted and clean up

---

### 2. Renaming/Moving a File

**Scenario:** A file is renamed or moved to a different path

#### Behavior

```bash
# Developer action
mv apps/my-app/old-name.html apps/my-app/new-name.html
git add -A
git commit -m "Rename file"

# Git perspective: This is a delete + add
# - old-name.html: deleted
# - new-name.html: new file
```

#### Detection Logic

```javascript
// Hash-based detection sees this as:
// 1. old-name.html: in storedHashes, NOT in currentFiles → DELETED
// 2. new-name.html: in currentFiles, NOT in storedHashes → NEW

// Even if content is identical, path is different
```

#### Result

**TWO files uploaded:**
1. ❌ old-name.html removed from manifest
2. ✅ new-name.html uploaded to Arweave (even if content identical)

**Why both operations?**
- Hash-based detection tracks by path + content
- Different path = different manifest entry
- Content hash may be same, but path hash differs
- Arweave cares about the manifest structure

**Cost implication:**
- Renaming a file incurs an upload cost (even if content unchanged)
- This is intentional: manifests are path-based

**Optimization opportunity:**
- Could detect content-identical renames and reuse transaction IDs
- Current implementation: simplicity over optimization
- Trade-off: small extra cost for clearer semantics

#### If Entry Point is Renamed

```javascript
// Special handling in ManifestManager.updateManifestWithNewFiles()
const correctEntryPoint = await this.manifestManager.getEntryPoint();
if (updatedManifest.index?.path !== correctEntryPoint) {
  console.log(`📝 Updating index path from "${updatedManifest.index?.path}" to "${correctEntryPoint}"`);
  updatedManifest.index = { path: correctEntryPoint };
}
```

**Entry point detection order:**
1. index.html
2. main.html
3. app.html
4. index.js
5. main.js
6. app.js
7. index.txt

If you rename `index.html` → `main.html`:
- Old index.html removed from manifest
- New main.html uploaded
- Manifest index updated to `main.html`

---

### 3. Hardcoding a Transaction ID for a Non-Existent File

**Scenario:** Developer manually edits manifest.json to add a txid for a file not in the directory

#### Setup

```json
// Developer manually edits apps/my-app/manifest.json
{
  "paths": {
    "index.html": { "id": "valid-txid-abc" },
    "phantom-file.js": { "id": "hardcoded-txid-xyz" }  // File doesn't exist!
  }
}
```

#### Behavior During Deployment

```javascript
// ManifestManager.getChangedFilesByHash()
const allFiles = await this.discoverAppFiles();  // Only finds actual files
const trackedFiles = await filterToGitTracked(allFiles);

// phantom-file.js is NOT in trackedFiles (doesn't exist)
// It's in manifest but not in currentFiles
```

#### Manifest Cleanup

```javascript
// ManifestManager.updateManifestWithNewFiles()
const currentRelativePaths = new Set(
  currentFiles.map(f => path.relative(this.appPath, f))
);

const cleanedPaths = {};
for (const [relativePath, fileData] of Object.entries(updatedManifest.paths)) {
  if (currentRelativePaths.has(relativePath)) {
    cleanedPaths[relativePath] = fileData;  // Keep
  } else {
    // phantom-file.js omitted - not in currentRelativePaths
  }
}
```

#### Result

- **Hardcoded entry REMOVED from manifest**
- **System self-heals** by removing non-existent files
- **No error thrown** - silent cleanup
- **Deployment proceeds normally**

#### Logging

```
🔍 Using hash-based change detection...
📁 Changed files: 0
```

No mention of phantom-file.js - it's silently removed.

#### Edge Case: Valid Transaction ID to Different File

```json
// Hardcode txid from file A to file B
{
  "paths": {
    "index.html": { "id": "txid-for-style-css" }  // Wrong txid!
  }
}
```

**Result:**
- If index.html content hasn't changed: txid preserved (serves wrong content!)
- If index.html content changed: new upload, correct txid assigned
- **Risk:** Manifest can serve wrong content if manually edited incorrectly

**Mitigation:**
- Don't manually edit manifest.json
- Always use deployment system
- CI/CD prevents manual edits by auto-committing

---

### Manual Transaction ID Overrides (manifest-overrides.json)

**Scenario:** Developer creates manifest-overrides.json to include external files

**Purpose:** Reference files already uploaded to Arweave without managing them locally

**Example:**
```json
{
  "jquery.min.js": "abc123...external-txid",
  "shared-logo.png": "def456...external-txid"
}
```

**Behavior:**
- Overrides loaded at deployment time
- Merged into manifest.paths after local files processed
- Take precedence if same path exists in local files
- Committed to git as part of app configuration
- Works in both local and CI/CD deployments

**Result:**
- External files included in manifest without local file
- No upload cost for these files
- Manifest references external transaction IDs
- Files served as part of app via Arweave gateway

**Edge Cases:**
- Missing overrides file: Gracefully ignored (no error)
- Invalid JSON: Warning logged, deployment continues
- Invalid TXIDs: No validation - manifest will fail to resolve at runtime
- Overrides for existing local files: Override takes precedence

---

### 4. File in Folder But Not Tracked by Git

**Scenario:** A file exists in the app directory but is not tracked by git (not added, or in .gitignore)

#### Setup

```bash
# Create untracked file
echo "Test content" > apps/my-app/untracked.html

# Check git status
git status
# Untracked files:
#   apps/my-app/untracked.html
```

#### Detection Logic

```javascript
// ManifestManager.getChangedFilesByHash()
const allFiles = await this.discoverAppFiles();  // Finds untracked.html

// Filter to git-tracked only
const trackedFiles = [];
for (const file of allFiles) {
  if (await gitTracker.isFileTracked(file)) {  // Safety check
    trackedFiles.push(file);
  }
}
```

```javascript
// GitTracker.isFileTracked()
async isFileTracked(filePath) {
  try {
    // ls-files --error-unmatch exits with error if file is not tracked
    execSync(`git ls-files --error-unmatch "${filePath}"`, { 
      stdio: 'pipe'  // suppress output
    });
    return true;  // File is tracked
  } catch {
    return false;  // File is not tracked
  }
}
```

#### Result

- **Untracked file IGNORED** - not included in deployment
- **Not uploaded to Arweave**
- **Not added to manifest**
- **No error thrown** - silent skip

#### Logging

No mention of untracked file. Only tracked files are processed.

#### Implications

- **Safety feature:** Prevents deploying work-in-progress files
- **Git-first approach:** Only committed files are deployable
- **CI/CD safe:** Shallow clones only see tracked files

#### To Deploy the File

```bash
git add apps/my-app/untracked.html
git commit -m "Add new file"
# Now it will be included in next deployment
```

#### Edge Case: File Tracked Then .gitignored

```bash
# Track and deploy file
git add apps/my-app/temp.html
git commit -m "Add temp file"
# Deploy → file uploaded

# Later: Add to .gitignore
echo "temp.html" >> .gitignore
git add .gitignore
git commit -m "Ignore temp file"
# Deploy → what happens?
```

**Behavior:**
- File still tracked by git (git doesn't auto-untrack .gitignored files)
- `git ls-files` still returns it
- File STILL DEPLOYED until explicitly removed from git

**To properly remove:**
```bash
git rm --cached apps/my-app/temp.html
git commit -m "Remove temp file from tracking"
# Now it will be deleted from manifest
```

---


### 5. No Changes Detected (Skip Deployment)

**Scenario:** Deployment triggered but no files have changed since last deployment

#### Setup

```bash
# Last deployment: commit abc123
# Current: commit abc123 (same, no new changes)
# OR: Current commit is different but no file content changed
```

#### Behavior

```javascript
// IncrementalDeployer.deploy()
const { changedFiles, currentFiles } = await this.manifestManager.getChangedFilesByHash(this.gitTracker);

if (changedFiles.length === 0) {
  return {
    success: true,
    skipped: true,
    reason: 'no_changes',
    appId: this.appId,
    commitHash: commitInfo.shortHash
  };
}
```

#### Result

- **No files uploaded**
- **No manifest uploaded**
- **No ArNS record created**
- **No deployment commit created**
- **Deployment marked as skipped**

#### Logging

```
🚀 Starting incremental deployment for app: my-app
📝 Current commit: a1b2c3d4e5f6g7h8
🔍 Last deployment commit: a1b2c3d4e5f6g7h8
🔍 Using hash-based change detection...
📁 Changed files: 0
```

#### Main Script Output

```javascript
// deploy.js
if (result.skipped) {
  console.log(`✅ No changes detected - deployment not needed`);
}
```

#### Cost

- **$0** - no uploads performed
- **Instant** - no network operations

#### Use Case

- **Trigger deployment multiple times** on same commit → only first succeeds
- **CI/CD safety** - can deploy on every push without waste
- **Manual re-runs** - safe to retry

---

### 6. Partial Upload Failure

**Scenario:** Some files upload successfully, but one fails mid-deployment

#### Simulation

```javascript
// During uploadChangedFiles()
for (let i = 0; i < changedFiles.length; i++) {
  const filePath = changedFiles[i];
  
  if (i === 2) {
    throw new Error('Network timeout');  // Simulated failure
  }
  
  const txId = await uploadToArweave(...);
  fileIds[filePath] = txId;
}
```

#### What Happens

```
📤 Uploading 5 changed files...
[1/5] Uploading index.html...
✅ Uploaded: txid-abc
[2/5] Uploading style.css...
✅ Uploaded: txid-def
[3/5] Uploading app.js...
❌ Failed to upload app.js: Network timeout
```

#### Error Handling

```javascript
// IncrementalDeployer.deploy()
try {
  const { newFileIds, fileHashes } = await this.uploadChangedFiles(changedFiles, testMode);
  // ...
} catch (error) {
  console.error(`❌ Incremental deployment failed: ${error.message}`);
  return {
    success: false,
    error: error.message,
    appId: this.appId
  };
}
```

#### Result

- **Deployment FAILS** - error returned to caller
- **No manifest update** - transaction aborted
- **No ArNS record created**
- **No deployment commit created**
- **Files uploaded before failure remain on Arweave** but are not referenced
- **deployment-tracker.json NOT updated** - preserves last known good state

#### Recovery

Next deployment attempt:
- **All 5 files re-uploaded** (including the 2 that succeeded before)
- **Reason:** tracker wasn't updated, so all files still look "changed"
- **Cost:** Wasted uploads for previously succeeded files

#### Optimization Opportunity

Could implement:
- Partial state save (track which files uploaded)
- Resume capability
- Transaction log for rollback

Current implementation: **fail-fast, preserve state**

---

### 7. Manifest Corruption

**Scenario:** manifest.json or deployment-tracker.json is corrupted or has invalid JSON

#### Corrupted Manifest

```json
// apps/my-app/manifest.json
{
  "manifest": "arweave/paths",
  "version": "0.2.0",
  "paths": {
    "index.html": { "id": "txid"  // Missing closing brace - invalid JSON!
```

#### Behavior

```javascript
// ManifestManager.loadManifest()
try {
  const manifestData = await readFile(this.manifestPath);
  return JSON.parse(manifestData);  // Throws SyntaxError
} catch (error) {
  throw new Error(`Failed to load manifest for ${this.appId}: ${error.message}`);
}
```

#### Result

- **Deployment FAILS** with error
- **Error message:** "Failed to load manifest for my-app: Unexpected token..."
- **No recovery attempted**
- **User must fix manually**

#### Corrupted Tracker

```javascript
// ManifestManager.loadDeploymentTracker()
try {
  const trackerData = await readFile(this.trackerPath);
  return JSON.parse(trackerData);  // Throws SyntaxError
} catch (error) {
  throw new Error(`Failed to load deployment tracker for ${this.appId}: ${error.message}`);
}
```

**Same result:** Deployment fails

#### Recovery Steps

1. **Restore from git history**
   ```bash
   git checkout HEAD~1 -- apps/my-app/manifest.json
   ```

2. **Restore from last deployment**
   - Check logs/deployments.json for last successful manifest txid
   - Download from Arweave gateway
   - Restore locally

3. **Rebuild from scratch** (if tracker is lost)
   - Delete deployment-tracker.json
   - Deployment treats it as first deployment
   - All files re-uploaded

#### Prevention

- CI/CD auto-commits these files → git history always available
- JSON files are human-readable and git-diffable
- Corruption rare in practice (file I/O failures)

---

### 8. Git Repository Issues

#### Scenario 8a: Not a Git Repository

**Setup:**
```bash
cd apps/my-app
rm -rf .git  # Remove git repository
```

**Behavior:**
```javascript
// IncrementalDeployer.deploy()
if (!(await this.gitTracker.isGitRepository())) {
  throw new Error('Not in a git repository. Incremental deployment requires git.');
}
```

**Result:**
- **Deployment FAILS immediately**
- **Error:** "Not in a git repository. Incremental deployment requires git."
- **No recovery without git**

**Resolution:**
```bash
git init
git add .
git commit -m "Initial commit"
# Now deployment will work
```

#### Scenario 8b: Git Not Configured

**Setup:**
```bash
git config --unset user.name
git config --unset user.email
```

**Behavior:**
```javascript
// GitTracker.createDeployCommit()
try {
  execSync(`git commit -m "${commitMessage}"`);
} catch (commitError) {
  if (commitError.message.includes('Author identity unknown')) {
    console.log(`⚠️ Git identity not configured, setting temporary identity...`);
    execSync(`git config user.email "deploy@agent-tests.com"`);
    execSync(`git config user.name "Deployment Bot"`);
    execSync(`git commit -m "${commitMessage}"`);  // Retry
  }
}
```

**Result:**
- **Deployment SUCCEEDS**
- **Auto-configured** with temporary identity
- **Warning logged** but not fatal

#### Scenario 8c: Shallow Clone (fetch-depth: 1)

**Setup:**
```yaml
# GitHub Actions
- uses: actions/checkout@v4
  with:
    fetch-depth: 1  # Shallow clone - only latest commit
```

**Behavior:**
- **Hash-based detection WORKS** (doesn't need git history)
- **No issues** with shallow clones
- **Faster checkouts** in CI/CD

**Why it works:**
- `git hash-object` works without full history
- Stored hashes in deployment-tracker.json
- No git diff needed

#### Scenario 8d: Detached HEAD State

**Setup:**
```bash
git checkout a1b2c3d4  # Detached HEAD
```

**Behavior:**
```javascript
// GitTracker.getCommitInfo()
const hash = commitHash || 'HEAD';
const output = execSync(`git log --format="%H|%s|%an|%ad" -n 1 ${hash}`);
```

**Result:**
- **Deployment SUCCEEDS**
- **Uses HEAD commit** regardless of branch
- **ArNS record** maps commit hash (works same as normal)

---

### 9. Network and Upload Failures

#### Scenario 9a: Arweave Upload Timeout

**Behavior:**
```javascript
// uploadToArweave()
const uploadResult = await turbo.uploadFile({...});
// If this hangs or times out...
```

**Result:**
- **Node.js waits indefinitely** (no default timeout)
- **Process hangs**
- **No automatic retry**

**Current handling:** None - relies on network stack timeouts

**Improvement needed:**
- Add upload timeout wrapper
- Implement retry logic
- Progress feedback for large files

#### Scenario 9b: ArNS Assignment Timeout

**Behavior:**
```javascript
// lib/arns.js - createUndernameRecord()
const result = await Promise.race([
  ant.setUndernameRecord({...}),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('ArNS assignment timeout after 120 seconds')), 120000)
  )
]);
```

**If timeout occurs:**
```javascript
if (error.message?.includes('timeout')) {
  console.log(`⏰ Timeout occurred, checking if assignment actually succeeded...`);
  const records = await ant.getRecords();
  if (records && records[undername]) {
    console.log(`✅ Assignment succeeded despite timeout!`);
    return { success: true, recordId: records[undername].id };
  }
  return { success: false, error: 'timeout', message: 'Assignment failed after timeout' };
}
```

**Result:**
- **120-second timeout** on ArNS assignment
- **Verification check** - queries ArNS to see if it actually worked
- **Smart recovery** - if assignment succeeded, deployment continues
- **If truly failed** - deployment fails but files already uploaded

**Implication:**
- Files uploaded to Arweave (cost incurred)
- But not referenced in ArNS (deployment incomplete)
- Manual recovery needed to create ArNS record

#### Scenario 9c: Insufficient Turbo Balance

**Behavior:**
```javascript
// uploadToArweave()
const balance = await turbo.getBalance();
// Balance check is informational only - no validation

const uploadResult = await turbo.uploadFile({...});
// If insufficient balance, upload FAILS
```

**Result:**
- **Upload fails** with Turbo error
- **Deployment fails**
- **No partial upload** (all-or-nothing per file)

**Error message:** (from Turbo SDK)
"Insufficient balance to complete upload"

**Resolution:**
- Add credits to Turbo account
- Retry deployment

---

### 10. Concurrent Deployments

#### Scenario: Two deployments triggered simultaneously for same app

**Setup:**
```bash
# Terminal 1
node deploy.js --file apps/my-app/ &

# Terminal 2 (immediately after)
node deploy.js --file apps/my-app/ &
```

#### What Happens

**Both processes:**
1. Read deployment-tracker.json (same state)
2. Calculate changed files (same result)
3. Upload files to Arweave (duplicate uploads!)
4. Update manifest (both create new versions)
5. Upload manifest (two different manifests)
6. Create ArNS records (second fails - undername taken!)
7. Try to commit deployment-tracker.json (git conflict!)

#### Actual Result

**Process 1:**
- Uploads files → succeeds
- Creates ArNS record for commit abc123 → succeeds
- Commits tracker → succeeds

**Process 2:**
- Uploads files → succeeds (duplicate, wasted)
- Creates ArNS record for commit abc123 → **FAILS** (already exists)
- Commits tracker → **FAILS** (git conflict)

#### ArNS Conflict Handling

```javascript
// lib/arns.js - createUndernameRecord()
if (error.message?.includes('already exists') || error.message?.includes('taken')) {
  return { success: false, error: 'undername_taken', message: error.message };
}
```

**Deployment fails** with undername taken error.

#### File System Race Condition

```javascript
// Potential race:
const tracker = await loadDeploymentTracker();  // Both read same state
tracker.deploymentCount++;  // Both increment from same value
await saveDeploymentTracker(tracker);  // Both write - last one wins
```

**Result:** deploymentCount may be incorrect (only incremented once instead of twice)

#### Prevention

**No built-in locking mechanism**
- No file locks
- No process coordination
- Assumes single deployment at a time

**Best practices:**
- CI/CD uses job concurrency limits
- Manual deployments: don't run concurrent
- If needed: implement external lock (file-based, Redis, etc.)

#### Current CI/CD Protection

```yaml
# GitHub Actions
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false  # Wait for current deployment
```

This prevents concurrent deployments from CI/CD.

---

### 11. Test Mode Scenarios

#### Scenario: Deployment with --test-mode flag

**Usage:**
```bash
node deploy.js --file apps/my-app/ --test-mode
```

#### Behavior

```javascript
// IncrementalDeployer.uploadChangedFiles(changedFiles, testMode = true)
if (testMode) {
  const mockTxId = `test-${Date.now()}-${i}`;
  fileIds[filePath] = mockTxId;
  console.log(`✅ Test upload: ${mockTxId}`);
} else {
  const txId = await uploadToArweave(...);  // Real upload
  fileIds[filePath] = txId;
}
```

```javascript
// IncrementalDeployer.uploadManifest(manifest, testMode = true)
if (testMode) {
  return `test-manifest-${Date.now()}`;
}
```

```javascript
// IncrementalDeployer.createArNSRecord(commitHash, manifestTxId, testMode = true)
if (testMode) {
  console.log(`🧪 Test mode: Would create ArNS record ${commitHash} → ${manifestTxId}`);
  return commitHash;
}
```

#### Result

- **No real uploads** to Arweave (saves money)
- **Mock transaction IDs** generated (test-timestamp-index)
- **Manifest updated locally** with mock IDs
- **Tracker updated** with current file hashes
- **Deployment commit skipped** in test mode
- **Full flow executed** except actual network operations

#### Use Cases

- **Development testing** - verify logic without cost
- **CI/CD dry-run** - validate changes before deployment
- **Debugging** - test deployment flow

#### Warning

Test mode **DOES** modify local files:
- manifest.json updated with test IDs
- deployment-tracker.json updated with real hashes

**Don't commit test mode results** - they have fake transaction IDs!

---

## Error Handling & Recovery

### Error Categories

#### 1. Validation Errors (Fail Fast)

**Examples:**
- Not a git repository
- No deployable files found
- No entry point found
- Invalid file path

**Handling:**
- Thrown immediately before any uploads
- No partial state changes
- User must fix and retry

#### 2. Upload Errors (Partial State)

**Examples:**
- Network failure during file upload
- Insufficient Turbo balance
- Invalid file content

**Handling:**
- Deployment fails
- Files uploaded before failure remain on Arweave
- Local state unchanged (tracker not updated)
- Retry will re-upload all files

#### 3. ArNS Errors (Post-Upload)

**Examples:**
- Undername already exists
- ArNS assignment timeout
- Invalid commit hash format

**Handling:**
- Files already uploaded (cost incurred)
- Manifest not created/updated
- Deployment marked as failed
- Manual intervention may be needed

### Recovery Strategies

#### Automatic Recovery

1. **Git identity missing** → Auto-configure temporary identity
2. **ArNS timeout with successful assignment** → Verify and proceed
3. **Deleted files in manifest** → Auto-remove from manifest
4. **Untracked files** → Auto-skip

#### Manual Recovery

1. **Corrupted manifest** → Restore from git or download from Arweave
2. **Partial upload failure** → Retry deployment (will re-upload all)
3. **ArNS assignment failed** → Manually create record or retry
4. **Git conflict** → Resolve conflict and retry

### State Consistency

#### Atomic Operations

**What's atomic:**
- Individual file uploads (all-or-nothing per file)
- Manifest upload (all-or-nothing)
- ArNS record creation (all-or-nothing)

**What's NOT atomic:**
- Multi-file upload batch (can fail partway)
- Entire deployment flow (multiple steps)

#### Rollback Capabilities

**No automatic rollback:**
- Files uploaded to Arweave are permanent
- Can't "undo" an upload
- Cost already incurred

**Rollback strategy:**
- ArNS records are versioned by commit
- Can point ArNS to previous commit's manifest
- Previous version still accessible

---

## CI/CD Specific Behaviors

### GitHub Actions Integration

#### Workflow Trigger

```yaml
on:
  workflow_run:
    workflows: ["Auto-merge Agent PRs"]
    types: [completed]
    branches: [main]
  workflow_dispatch:
```

- Triggered after auto-merge completes
- Can be manually triggered
- Only runs on main branch

#### Shallow Clone

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 1  # Only latest commit
```

**Implications:**
- Fast checkout
- Minimal data transfer
- Hash-based detection works perfectly
- No git history available (but not needed)

#### Environment Variables

All config from GitHub Secrets:
- ANT_PROCESS_ID
- OWNER_ARNS_NAME
- WALLET_ADDRESS
- ARWEAVE_JWK_JSON (wallet as JSON string)
- TURBO_PAYMENT_SERVICE_URL
- TURBO_UPLOAD_SERVICE_URL

**Security:** Sensitive data never in code

#### Deployment Loop

```bash
find apps/ -type d -mindepth 1 -maxdepth 1 | while read -r app_dir; do
  app_name=$(basename "$app_dir")
  node deploy.js --file "$app_dir" --message "Auto-deployed"
done
```

**Behavior:**
- Deploys ALL apps in apps/ directory
- Each app deployed independently
- Failure in one app doesn't stop others
- All apps checked for changes (hash-based)

#### Deployment Commit Skipping

```javascript
// IncrementalDeployer.deploy()
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
if (!testMode && !isCI) {
  await this.gitTracker.createDeployCommit(...);
} else if (isCI) {
  console.log(`⏭️ Skipping deployment commit in CI environment`);
}
```

**Why skip in CI:**
- CI environment commits are handled separately
- Workflow commits manifest/tracker in dedicated step
- Prevents nested commits during deployment

#### Auto-Commit Step

```yaml
- name: Commit deployment logs and manifests
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    
    if [ -f "logs/deployments.json" ]; then
      git add logs/
    fi
    
    if ! git diff --cached --quiet; then
      git commit -m "Update deployment logs"
      git push origin main
    fi
```

**Committed files:**
- logs/deployments.json
- apps/*/manifest.json (if changed)
- apps/*/deployment-tracker.json (if changed)

**Purpose:**
- Preserve deployment state
- Enable future incremental deployments
- Audit trail

---

## Data Integrity & State Management

### File Hash Storage

**Format:**
```json
"fileHashes": {
  "index.html": "caec3826ccfb35618dc56489b7902f97a3aa424d",
  "style.css": "22153922a682a2a2e37a0f5d89caca9a87c160d6"
}
```

**Hash algorithm:** SHA-256 (via git hash-object)

**Properties:**
- **Deterministic:** Same content → same hash
- **Collision-resistant:** Different content → different hash (extremely high probability)
- **Git-compatible:** Uses git's hashing

### Manifest Version

```json
{
  "manifest": "arweave/paths",
  "version": "0.2.0",  // Arweave manifest spec version (fixed)
  "index": { "path": "index.html" }
}
```

**Note:** `version` is the Arweave manifest specification version, not app version.

**App versioning:** Tracked via git commits and deployment history

### Deployment History

```json
"recentDeployments": [
  {
    "commit": "a1b2c3d4e5f6g7h8",
    "manifestTxId": "manifest-txid",
    "changedFiles": ["index.html", "style.css"],
    "deployed": "2025-10-14T12:00:00.000Z"
  }
]
```

**Limit:** Last 3 deployments kept

**Purpose:**
- Audit trail
- Debugging
- Rollback information

### State Synchronization

**Files that must stay in sync:**
1. manifest.json (transaction IDs)
2. deployment-tracker.json (file hashes)
3. Git commits (source of truth)

**Synchronization mechanism:**
- All updated together in deployment flow
- Committed together by CI/CD
- Git ensures version control

**Desynchronization scenarios:**
- Manual editing (don't do this!)
- Partial deployment failure (tracker not updated)
- Git merge conflicts (resolve carefully)

---

## Security Considerations

### Wallet Security

**Best practice:**
```bash
# CI/CD: Use GitHub Secrets
ARWEAVE_JWK_JSON="{ ...wallet JSON... }"

# Local: Use wallet file outside repo
ARWEAVE_WALLET_PATH="../wallet.json"
```

**Never commit:**
- Wallet JSON files
- Private keys
- Secret credentials

### File Path Validation

```javascript
// utils.js - validateFilePath()
if (filePath.includes('..') || filePath.startsWith('/')) {
  throw new Error('File path must be relative and not contain parent directory references');
}
```

**Protection against:**
- Path traversal attacks
- Deploying files outside app directory

### Git-Tracked Files Only

```javascript
// Only deploy files tracked by git
if (await gitTracker.isFileTracked(file)) {
  trackedFiles.push(file);
}
```

**Protection against:**
- Accidentally deploying .env files
- Deploying unintended local files
- Deploying secrets or temporary files

### Manifest Integrity

**No validation that transaction IDs are valid:**
- System trusts manifest.json contents
- Manually edited manifests can break deployment
- No checksum or signature verification

**Risk:**
- Malicious or accidental manifest edits
- Serving wrong content

**Mitigation:**
- Don't manually edit manifests
- CI/CD auto-commits prevent tampering
- Git history provides audit trail

---

## Performance Characteristics

### Deployment Times

**First deployment (all files):**
- File discovery: < 1s
- Hash calculation: < 1s (git hash-object is fast)
- Uploads: 50-500ms per file (depends on size, network)
- Manifest upload: 50-100ms
- ArNS assignment: 5-30s (AO process interaction)
- **Total: Mostly upload time + ArNS time**

**Incremental deployment (2 files changed out of 50):**
- File discovery: < 1s
- Hash calculation: 1-2s (all 50 files)
- Uploads: 100-1000ms (only 2 files)
- Manifest upload: 50-100ms
- ArNS assignment: 5-30s
- **Total: ~7-35s (vs ~25-250s for full deployment)**

**No changes detected:**
- File discovery: < 1s
- Hash calculation: 1-2s
- **Total: ~1-3s (instant skip)**

### Cost Savings

**Example app: 50 files, 5MB total**

**Full deployment every time:**
- 50 files × cost per file
- 5MB upload cost
- Every deployment

**Incremental (2 files changed, 100KB):**
- 2 files × cost per file
- 100KB upload cost
- **96% cost savings**

### Hash Calculation Performance

**git hash-object:**
- Extremely fast (native git implementation)
- Hashes 100 files in ~1-2 seconds
- No noticeable overhead

**Alternative (SHA-256 in Node.js):**
- Would be slower for large files
- Git's implementation is optimized

---

## Recommendations

### For Users

1. **Always commit changes before deploying**
   - Ensures git history is accurate
   - Prevents deploying uncommitted work

2. **Never manually edit manifest.json or deployment-tracker.json**
   - Let the system manage these files
   - Manual edits can break deployments

3. **Use test mode for development**
   ```bash
   node deploy.js --file apps/my-app/ --test-mode
   ```
   - Validates deployment flow without cost
   - Don't commit test mode results

4. **Monitor deployment logs**
   - Check logs/deployments.json
   - Verify transaction IDs on Arweave gateway

5. **Use CI/CD for production deployments**
   - Consistent environment
   - Automatic state management
   - Audit trail

### For System Improvements

1. **Add upload retry logic**
   ```javascript
   async function uploadWithRetry(file, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await uploadToArweave(file);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await sleep(2 ** i * 1000);  // Exponential backoff
       }
     }
   }
   ```

2. **Implement transaction log**
   - Track each upload operation
   - Enable resume on failure
   - Prevent duplicate uploads on retry

3. **Add manifest validation**
   - Verify transaction IDs exist on Arweave
   - Check manifest structure before deployment
   - Warn on manual edits

4. **Optimize rename detection**
   - Detect content-identical renames
   - Reuse transaction IDs for renamed files
   - Save upload costs

5. **Add deployment locking**
   - Prevent concurrent deployments
   - File-based or database lock
   - Graceful "deployment in progress" message

6. **Enhanced error messages**
   - More specific error types
   - Recovery suggestions
   - Links to documentation

7. **Deployment dry-run mode**
   - Show what would be deployed
   - Cost estimation
   - No state changes

8. **Manifest backup**
   - Auto-backup before updates
   - Restore from backup on failure
   - Keep last N versions

---

## Appendix: Flow Diagrams

### Change Detection Flow

```
Start
  ↓
Load deployment-tracker.json
  ├── Exists → Load file hashes
  └── Not exists → Empty hashes (first deployment)
  ↓
Discover all files in app directory
  ↓
Filter to git-tracked files only
  ↓
For each file:
  ├── Calculate current hash (git hash-object)
  ├── Get stored hash from tracker
  └── Compare:
      ├── No stored hash → CHANGED (new file)
      ├── Hash differs → CHANGED (modified)
      └── Hash same → UNCHANGED
  ↓
Identify deleted files:
  ├── In stored hashes but not in current files
  └── Mark for removal from manifest
  ↓
Return: changedFiles + currentFiles
```

### Deployment Flow

```
Start
  ↓
Validate git repository
  ↓
Get commit info
  ↓
Load deployment tracker
  ↓
Detect changed files (see above)
  ↓
┌─────────────────┐
│ changedFiles.length === 0?
├── Yes → Return SKIPPED
└── No → Continue
  ↓
Upload each changed file to Arweave
  ↓
Load current manifest
  ↓
Update manifest:
  ├── Add/update transaction IDs for changed files
  └── Remove entries for deleted files
  ↓
Upload updated manifest to Arweave
  ↓
Create ArNS record (commit → manifest txid)
  ↓
Update deployment tracker:
  ├── New file hashes
  ├── Deployment metadata
  └── Increment deployment count
  ↓
Save updated manifest locally
  ↓
┌─────────────────┐
│ CI environment?
├── Yes → Skip commit
└── No → Create deployment commit
  ↓
Return SUCCESS
```

---

## Conclusion

The incremental deployment system is a well-architected solution for cost-effective Arweave deployments. It uses hash-based change detection to upload only modified files, significantly reducing costs and deployment times.

**Strengths:**
- Simple, deterministic change detection
- Git-independent (works with shallow clones)
- Automatic state management
- Handles most edge cases gracefully
- CI/CD friendly

**Edge cases handled well:**
- File deletion → automatic manifest cleanup
- First deployment → uploads all files
- No changes → instant skip
- Git issues → auto-configuration or clear errors
- Untracked files → safely ignored

**Edge cases needing improvement:**
- Partial upload failures → no resume capability
- File renaming → re-uploads even if content unchanged
- Concurrent deployments → no locking mechanism
- Manifest corruption → no auto-recovery

**Overall:** Production-ready with minor opportunities for enhancement.

---

**End of Report**
