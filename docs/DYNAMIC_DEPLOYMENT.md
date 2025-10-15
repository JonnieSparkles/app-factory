# Dynamic Arweave Deployment

Deploys only changed files to Arweave using hash-based detection, saving costs and time. This system can be used as part of the full remote agent deployment suite or as a standalone deployment engine.

## Table of Contents

- [How It Works](#how-it-works)
- [Usage Options](#usage-options)
  - [Full System (with Auto Actions)](#full-system-with-auto-actions)
  - [Standalone Deployment Engine](#standalone-deployment-engine)
- [File Structures](#file-structures)
- [Example Workflow](#example-workflow)
- [Implementation Details](#implementation-details)

## How It Works

1. **Hash Calculation** - Calculate SHA-256 hash for each file using `git hash-object`
2. **Change Detection** - Compare current hashes with stored hashes from deployment-tracker.json
3. **Selective Upload** - Upload only files where hash changed
4. **State Update** - Store updated hashes for next deployment

### Benefits
- **Deterministic**: Same file content = same hash = no re-upload
- **Git independent**: Works with shallow clones (fetch-depth: 1)
- **Reliable**: No merge conflicts or git history issues
- **Simple**: One code path, easy to debug
- **Cost Efficient**: Only upload changed files, saving 90%+ on subsequent deployments

## Usage Options

### Full System (with Auto Actions)

Use the complete remote agent deployment system with GitHub Actions, Discord notifications, and automated workflows:

```bash
# Deploy with full automation
node deploy.js --file apps/my-app/

# Test deployment
node deploy.js --test-mode --file apps/my-app/

# View logs and stats
node deploy.js --logs
node deploy.js --stats
```

**Features included:**
- ✅ Dynamic deployment engine
- ✅ GitHub Actions integration (3-workflow pipeline)
- ✅ Discord notifications
- ✅ Deployment logging
- ✅ Auto-merge workflows
- ✅ CLI interface

**Automation vs Manual:**
- **Automated**: AI agent creates PR → auto-merge → deploy → announce (fully hands-off)
- **Manual**: Run `node deploy.js --file apps/my-app/` directly (single deployment)

### Standalone Deployment Engine

Use just the dynamic deployment core without auto-actions:

**1. Install Core Dependencies**
```bash
npm install @ardrive/turbo-sdk @ar.io/sdk dotenv
```

**2. Copy Essential Files**
Copy these files from the `lib/` directory:
- `dynamic-deploy.js` - Main deployment class
- `arweave.js` - Arweave upload utilities  
- `arns.js` - ArNS record management
- `manifest-manager.js` - Manifest handling
- `git-tracker.js` - Git operations
- `utils.js` - Utility functions

**3. Environment Setup**
```bash
# .env file
ANT_PROCESS_ID=your_arns_process_id
ARWEAVE_JWK_JSON={"kty":"RSA","n":"...","e":"AQAB",...}
APP_NAME=YourAppName
TURBO_USE_SHARED_CREDITS=true
ARNS_UNDERNAME_TTL=60
```

**4. Project Structure**
```
your-app/
├── index.html          # Entry point
├── style.css           # Your app files
├── script.js
├── manifest.json       # Auto-generated
├── deployment-tracker.json  # Auto-generated
└── .git/               # Git repository required
```

**5. Simple Usage**
```javascript
import { DynamicDeployer } from './lib/dynamic-deploy.js';
import dotenv from 'dotenv';

dotenv.config();

async function deploy() {
  const deployer = new DynamicDeployer('my-app', './src');
  
  // Validate the app
  const validation = await deployer.validateApp();
  if (!validation.valid) {
    console.error('Validation failed:', validation.error);
    return;
  }
  
  // Deploy (test mode first)
  const result = await deployer.deploy(true); // true = test mode
  
  if (result.success) {
    console.log('Deployment successful!');
    console.log('Manifest TX:', result.manifestTxId);
    console.log('ArNS:', result.undername);
    console.log(`Deployed to: https://arweave.net/${result.manifestTxId}`);
    console.log(`ArNS: https://${result.undername}.ar-io.dev`);
  }
}

deploy().catch(console.error);
```

**What you get:**
- ✅ Dynamic deployments (only changed files)
- ✅ Git integration (commit hashes as ArNS names)
- ✅ ArNS integration (automatic domain-like naming)
- ✅ Manifest management (handles complex multi-file apps)
- ✅ Cost efficiency (Turbo SDK + shared credits)

**What you skip:**
- ❌ Discord notifications
- ❌ GitHub Actions integration
- ❌ Auto-merge workflows
- ❌ Deployment logging
- ❌ Complex CLI interface

## File Structures

### Arweave Manifest

```json
{
  "manifest": "arweave/paths",
  "version": "0.2.0",
  "index": { "path": "index.html" },
  "paths": {
    "index.html": { "id": "bnYTf5wGyZRWUxNHa8R8eENBe6iHcWi4SudmMfBkzRE" },
    "css/style.css": { "id": "xyz789...css-id" },
    "js/app.js": { "id": "abc123...js-id" }
  }
}
```

### Deployment Tracker

```json
{
  "lastDeployCommit": "a1b2c3d4e5f6g7h8",
  "lastDeployed": "2025-10-13T12:00:00.000Z",
  "deploymentCount": 5,
  "fileHashes": {
    "index.html": "caec3826ccfb35618dc56489b7902f97a3aa424d",
    "style.css": "22153922a682a2a2e37a0f5d89caca9a87c160d6",
    "app.js": "3d1f4b8f4829479592ea107394262e00d1a5e51c"
  }
}
```

### Manual Overrides

External file references - merge into manifest during deployment:

```json
{
  "external-lib.js": "arweave-transaction-id-here",
  "shared-asset.png": "another-arweave-txid"
}
```

## Example Workflow

**Timeline:**
- Monday: Deploy v1.0 (all files)
- Tuesday: Change index.html
- Wednesday: Change style.css  
- Friday: Deploy v1.1

**Friday deployment:**
```
🔍 Using hash-based change detection...
📝 File changed: index.html (modified)
📝 File changed: style.css (modified)
📁 Changed files: 2
```

**Result:**
- 2 files deployed (only changed ones)
- Updated manifest with new TXIDs for changed files
- Preserved existing TXIDs for unchanged files
- 97% cost savings (2 files vs 100 files)

## Key Benefits

1. **Commit tracker files** - Always commit manifest.json and deployment-tracker.json
2. **Use git for versioning** - Git commit hash used as ArNS undername
3. **Deploy frequently** - Smaller deployments = fewer files to upload
4. **Handle edge cases** - First deployment uploads all files, no changes skips deployment

## Implementation Details

### Change Detection Flow
1. Load deployment-tracker.json
2. Hash all files in app directory
3. Compare current hashes with stored hashes
4. Upload only files with different hashes
5. Update manifest with new Arweave TXIDs
6. Upload updated manifest
7. Update tracker with new hashes and commit info
8. Commit tracker and manifest back to repo

### Full System Integration

**GitHub Actions Integration:**

The system includes three interconnected workflows that create a complete automation pipeline:

**1. Auto-merge Workflow** (`.github/workflows/auto-merge.yml`)
- Automatically merges PRs from agent branches (e.g., `cursor/feature-name`)
- Only processes PRs from trusted users
- Triggers deploy workflow if apps/ directory has changes

**2. Deploy Workflow** (`.github/workflows/deploy.yml`)
- Runs after successful auto-merge (or manual trigger)
- Deploys all apps using dynamic detection
- Commits deployment logs and manifests back to repo
- Triggers announce workflow if deployments occurred

**3. Announce Workflow** (`.github/workflows/announce.yml`)
- Sends Discord notifications about deployment results
- Handles both successful deployments and "no changes" scenarios

**Complete Automation Flow:**
```
AI Agent → Creates PR → Auto-merge → Deploy → Announce
```

**Manual Deployment:**
```yaml
- name: Deploy to Arweave
  run: node deploy.js --file apps/my-app/
  # Automatically uses hash-based detection
  # Commits manifest and tracker files back to repo
```

**CLI Usage:**
```bash
# Deploy with full automation
node deploy.js --file apps/my-app/

# Test mode (no real upload)
node deploy.js --test-mode --file apps/my-app/

# Full deployment (no dynamic optimization)
node deploy.js --no-dynamic --file apps/my-app/
```

### Standalone Integration

**Basic Node.js Script:**
```javascript
import { DynamicDeployer } from './lib/dynamic-deploy.js';

const deployer = new DynamicDeployer('my-app', './src');
const result = await deployer.deploy(false); // false = real deployment

if (result.success) {
  console.log(`✅ Deployed ${result.changedFiles.length} files`);
  console.log(`📦 Size: ${result.stats.totalSize} bytes`);
  console.log(`🔗 Manifest: ${result.manifestTxId}`);
  console.log(`🌐 ArNS: ${result.undername}`);
}
```

**Integration with Build Tools:**
```javascript
// webpack.config.js or similar
import { DynamicDeployer } from './lib/dynamic-deploy.js';

export default {
  // ... webpack config
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tapAsync('DeployPlugin', async (compilation, callback) => {
          const deployer = new DynamicDeployer('my-app', './dist');
          await deployer.deploy();
          callback();
        });
      }
    }
  ]
};
```

### Key Classes and Methods

**DynamicDeployer Class:**
- `deploy(testMode)` - Main deployment method
- `validateApp()` - Validate app structure
- `getDeploymentInfo()` - Get current deployment status
- `getDeploymentHistory()` - Get deployment history

**ManifestManager Class:**
- `loadManifest()` - Load existing manifest
- `saveManifest(manifest)` - Save manifest to disk
- `getChangedFilesByHash()` - Find changed files

**GitTracker Class:**
- `getCommitInfo()` - Get current commit information
- `getFileHash(filePath)` - Get file hash for change detection
- `isGitRepository()` - Check if in git repo