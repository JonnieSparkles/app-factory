# Remote Agent Deployment System

A streamlined deployment system for AI agent workflows that deploys files and applications to Arweave with unique ArNS undernames, featuring **incremental deployment**, auto-merge GitHub Actions, and comprehensive logging.

> **Note**: The `apps/` folder contains example applications. Replace these with your own projects and applications.

## 🚀 Quick Start

1. **Set up environment variables** (see [docs/REMOTE_AGENT_SETUP.md](./docs/REMOTE_AGENT_SETUP.md))
2. **Replace example apps** with your own projects in the `apps/` folder
3. **Deploy a file**:
   ```bash
   node deploy.js --file path/to/your/file.html
   ```
4. **Deploy a directory** (uses incremental deployment):
   ```bash
   node deploy.js --file path/to/your/app/
   ```
5. **Or ask the AI agent to make changes** - it will automatically:
   - Create a branch and make changes
   - Create a PR (auto-merge enabled)
   - Deploy to Arweave with ArNS integration
6. **Monitor deployments** via logs and GitHub Actions

## Overview

This project enables AI agents and developers to:
1. **Deploy individual files** or entire directories to Arweave
2. **Smart deployment detection** - automatically uses incremental deployment for directories
3. **Deploy to Arweave** via Turbo SDK with fiat payments
4. **Create ArNS records** with unique undernames based on commit hashes
5. **Auto-merge PRs** via GitHub Actions for seamless workflow
6. **Monitor all deployments** with comprehensive logging
7. **🆕 Incremental deployment** - only upload changed files, saving costs and time
8. **🆕 Shared credits support** - automatically use shared Turbo credits for larger files

## 🏗️ Architecture

```
Files/Directories → Smart Deployment Detection → Arweave → ArNS Records
     ↓
AI Agent → Create Branch → Make Changes → Create PR → Auto-merge → Deploy → Arweave → ArNS Record
```

### Project Structure
```
your-project/
├── apps/                # Your applications (replace examples with your own)
│   ├── web-app/         # Example web application
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── app.js
│   │   ├── manifest.json          # ← Per-app manifest (auto-created for directories)
│   │   └── deployment-tracker.json # ← Deployment history (auto-created for directories)
│   ├── static-site/     # Example static site
│   │   └── index.html
│   └── simple-file/     # Example single file
│       └── content.txt
└── ...                  # Your other project files
```

**Customizing Your Project:**
- Replace the example apps in `apps/` with your own applications
- You can organize your apps however you prefer (by type, client, etc.)
- The system works with any file structure - just point to your files/directories

### Key Components

- **🤖 AI Agent Integration**: Seamless workflow with auto-merge GitHub Actions
- **⚡ Turbo SDK**: Handles Arweave uploads with fiat payments
- **🏷️ ArNS SDK**: Manages Arweave Name Service records with 60-second TTL
- **🔑 Commit Hash**: SHA-256 hash used as unique identifier for each deployment
- **📝 ArNS Undername**: Maps commit hash to Arweave transaction ID
- **📊 Logging System**: Comprehensive JSON logging with rolling history (last 50 deployments)
- **🔄 Auto-merge**: GitHub Actions automatically merge agent PRs after validation
- **🧠 Smart Detection**: Automatically detects files vs directories and uses appropriate deployment method

## 🔄 Complete Workflow

**Standard Agent Workflow Steps:**
1. **🤖 Agent Request**: You ask the AI agent to make changes
2. **📝 Make Updates**: Agent modifies files as requested
3. **🧪 Test Changes**: Agent tests the changes (if appropriate)
4. **🌿 Branch Creation**: Agent creates `cursor/feature-branch` 
5. **📋 PR Creation**: Agent creates pull request against main
6. **✅ Auto-merge**: GitHub Actions validates and auto-merges PR
7. **🔍 Change Detection**: Auto-merge workflow checks if changes affect `apps/` directory
8. **☁️ Conditional Deploy**: Only deploys if `apps/` changes detected (saves resources)
9. **🏷️ ArNS Assignment**: Transaction ID assigned to undername (commit hash)
10. **📊 Logging**: Deployment logged to JSON file with rolling history
11. **📢 Announce**: Post deployment announcement to Discord (if requested)
12. **🎉 Completion**: Agent ready for next task

**AI Agent Instructions:**
- Always follow the sequence: Make Updates → Test → Deploy → Announce
- Use `node deploy.js --file <path>` for file/directory deployments
- Use `node deploy.js --content <text>` for direct content deployment
- Test deployments with `--test-mode` before real deployments
- Check logs with `node deploy.js --logs` and stats with `node deploy.js --stats`

**Key Principle: Always follow the sequence: Make Updates → Test → Deploy → Announce**

## ⚙️ Environment Setup

**📋 For detailed setup instructions, see [docs/REMOTE_AGENT_SETUP.md](./docs/REMOTE_AGENT_SETUP.md)**

### Required Environment Variables

```env
# ArNS Configuration (Required)
ANT_PROCESS_ID=your-arns-process-id
OWNER_ARNS_NAME=your-arns-name
WALLET_ADDRESS=your-wallet-address

# Wallet Configuration (Choose one)
ARWEAVE_JWK_JSON={"kty":"RSA","e":"AQAB","n":"...","d":"..."}
# OR
ARWEAVE_WALLET_PATH=./secrets/wallet.json

# ArNS Configuration
ARNS_UNDERNAME_TTL=60
DEFAULT_TTL_SECONDS=60

# Turbo Configuration
TURBO_PAYMENT_SERVICE_URL=https://payment.ardrive.dev
TURBO_UPLOAD_SERVICE_URL=https://upload.ardrive.dev

# Shared Credits Configuration (Optional)
# Enable automatic shared credits usage for larger files
# SDK will automatically find and use available credit share approvals
# (closest to expiration first, then lowest amounts, then signer's balance)
TURBO_USE_SHARED_CREDITS=true

# Application Configuration
APP_NAME=RemoteAgentDeploy
ARWEAVE_GATEWAY=https://arweave.net
```

## 🎯 Usage

### Deployment Commands

**Deploy files and directories:**

```bash
# Deploy a single file
node deploy.js --file path/to/your/file.html
node deploy.js --file my-app.html

# Deploy a directory (uses incremental deployment)
node deploy.js --file path/to/your/app/
node deploy.js --file apps/your-project/

# Deploy content directly
node deploy.js --content "Hello, World!"

# Test deployment (no real upload)
node deploy.js --test-mode --file path/to/your/app/

# Force full deployment (no incremental)
node deploy.js --no-incremental --file path/to/your/app/

# View deployment logs and stats
node deploy.js --logs
node deploy.js --stats
```

### AI Agent Commands

**The agent knows how to use these deployment options:**

```bash
# Deploy specific files or directories
"Deploy the web app"
"Update and deploy the static site"
"Deploy the project directory"

# Deploy all files in a directory
"Deploy all apps to Arweave"

# Create and deploy new content
"Create a new HTML file and deploy it"
"Deploy this content directly"
```

**The agent will automatically:**
- Use `node deploy.js --file <path>` for file/directory deployments
- Use `node deploy.js --content <text>` for direct content deployment
- Automatically detect whether to use incremental or simple deployment

### Manual Deployment Commands
```bash
# Deploy a file or directory
node deploy.js --file path/to/your/file.html
node deploy.js --file path/to/your/app/

# Test mode (no real deployment)
node deploy.js --test-mode --file path/to/your/app/

# View deployment logs
node deploy.js --logs

# View deployment statistics  
node deploy.js --stats
```

## 🚀 Smart Deployment System

The system features two key optimizations for efficient deployments:

### 🔍 Conditional Deployment Triggering
**New Feature**: The auto-merge workflow now intelligently checks if changes affect the `apps/` directory before triggering deployments.

- **Smart Detection**: Only deploys when `apps/` directory changes are detected
- **Resource Savings**: Skips unnecessary deployments when only non-app files change (docs, configs, etc.)
- **Manual Override**: Manual deployments via GitHub Actions still work for all scenarios
- **Efficient Workflow**: Reduces GitHub Actions usage and deployment costs

### ⚡ Incremental Deployment
**Cost and time-optimized approach** that only uploads files that have actually changed since the last deployment.

**📋 For detailed technical documentation, see [docs/INCREMENTAL_ARWEAVE_DEPLOYMENT.md](./docs/INCREMENTAL_ARWEAVE_DEPLOYMENT.md)**

### How It Works

1. **Hash-based change detection** - Compares SHA-256 file hashes for deterministic change detection
2. **Per-app manifests** - Each app maintains its own `manifest.json` and `deployment-tracker.json`
3. **Smart file tracking** - Only uploads files that have changed content
4. **Version control** - Automatic version incrementing and deployment history
5. **Cost optimization** - Pay only for files that actually changed
6. **Git independence** - Works with shallow clones, no git history needed

### Benefits

- ✅ **Cost savings** - Only pay for changed files (can save 90%+ on small updates)
- ✅ **Faster deployments** - Less data to upload
- ✅ **Deterministic** - Same file content = same hash = no re-upload
- ✅ **Deployment history** - Track all deployments per app
- ✅ **Git efficient** - Works with shallow clones (fetch-depth: 1)
- ✅ **Reliable** - No git history dependencies or merge conflicts
- ✅ **Safe by default** - Only deploys git-tracked files (prevents accidental secret leaks)
- ✅ **Handles file operations** - Automatically handles renames, moves, and deletions

### File Structure

Directories automatically get tracking files for incremental deployment:

```
your-app/
├── index.html
├── style.css
├── app.js
├── manifest.json          # Arweave manifest with file IDs (auto-created)
├── deployment-tracker.json # Optimized deployment tracking (auto-created)
└── manifest-overrides.json # Manual TXID overrides (optional)
```

Single files don't need tracking files:
```
your-simple-file/
└── content.txt            # Simple file deployment, no tracking needed
```

### Optimized Deployment Tracking

The `deployment-tracker.json` uses an optimized structure for better performance:

```json
{
  "version": "1.0.0",
  "lastDeployCommit": "abc123...",
  "lastDeployed": "2025-10-13T22:10:12.763Z",
  "deploymentCount": 3,
  "fileHashes": {
    "index.html": "sha256-hash-here",
    "style.css": "sha256-hash-here"
  },
  "recentDeployments": [
    {
      "commit": "abc123...",
      "manifestTxId": "arweave-tx-id",
      "changedFiles": ["index.html", "style.css"],
      "deployed": "2025-10-13T22:10:12.763Z"
    }
  ]
}
```

**Key optimizations:**
- **Limited history**: Only keeps 3 most recent deployments (vs unlimited)
- **Essential data only**: Removed redundant fields for faster processing
- **Hash-based detection**: Uses SHA-256 hashes for deterministic change detection
- **Schema versioning**: Version field for future structure evolution

### Usage

Incremental deployment is **enabled by default for directories**:

```bash
# Deploy directory with incremental deployment (hash-based detection)
node deploy.js --file path/to/your/app/

# Deploy directory with full deployment (all files, skip change detection)
node deploy.js --no-incremental --file path/to/your/app/

# Deploy single file (always uses simple deployment)
node deploy.js --file path/to/your/file.html

# Test incremental deployment
node deploy.js --test-mode --file path/to/your/app/
```

### Change Detection Method

**Hash-based Detection (Always Active)**
- Calculates SHA-256 hash of each file using `git hash-object`
- Compares current hashes with stored hashes in deployment-tracker.json
- Deterministic: same content = same hash = no re-upload
- Works with shallow git clones (no history needed)
- Independent of git commit history or merge states
- **Safety filter**: Only processes git-tracked files (prevents untracked file deployment)
- **File operation support**: Detects renames, moves, and deletions automatically

### GitHub Actions Integration

The GitHub Actions workflow automatically uses incremental deployment with shallow clones:

```yaml
# In .github/workflows/deploy.yml
- name: Checkout
  uses: actions/checkout@v4
  with:
    fetch-depth: 1  # Shallow clone - we use hash-based change detection
```

This means:
- **First deployment** - Uploads all files (no stored hashes yet)
- **Subsequent deployments** - Only uploads files with changed content hashes
- **No changes** - Skips deployment entirely
- **Fast checkouts** - Minimal git history needed (just current commit)

### Deployment Flow

1. **Discover all files** in the app directory
2. **Filter to git-tracked files** (safety check - prevents untracked file deployment)
3. **Hash tracked files** using SHA-256 via `git hash-object`
4. **Compare hashes** with stored hashes in deployment-tracker.json
5. **Upload only changed files** to Arweave
6. **Update manifest** with new file IDs and remove deleted/moved file entries
7. **Upload updated manifest** to Arweave
8. **Create ArNS record** pointing to manifest (using commit hash as undername)
9. **Update tracking files** with new hashes and commit info
10. **Commit back to repo** (manifest.json and deployment-tracker.json)

### Example Output

```
🚀 Starting incremental deployment for app: your-app
📝 Current commit: a1b2c3d4 - Add new feature
🔍 Last deployment commit: x9y8z7w6
🔍 Using hash-based change detection...
📝 File changed: index.html (modified)
📝 File changed: style.css (modified)
🗑️ File deleted: old-file.html
📁 Changed files: 2
📤 Uploading 2 changed files...
[1/2] Uploading style.css...
✅ Uploaded: abc123...
[2/2] Uploading index.html...
✅ Uploaded: def456...
📋 Updated manifest with 2 new file IDs
✅ Manifest uploaded: xyz789...
🔗 Creating ArNS record: a1b2c3d4 → xyz789...
✅ ArNS record created: a1b2c3d4
🎉 Incremental deployment complete!
   📁 Files changed: 2
   📦 Total size: 15.2 KB
   🔗 Manifest TX: xyz789...
   🔗 ArNS: a1b2c3d4
```

### Manual Transaction ID Overrides

For referencing files that are already uploaded to Arweave or managed externally, you can create a `manifest-overrides.json` file in your app directory:

**apps/my-app/manifest-overrides.json**
```json
{
  "external-library.js": "abc123def456789_arweave_txid",
  "shared-assets/logo.png": "xyz789uvw012345_arweave_txid",
  "cdn/jquery.min.js": "def456ghi789jkl_arweave_txid"
}
```

Benefits:
- Reference shared libraries already on Arweave
- Include CDN-style resources without re-uploading
- Manage large assets separately
- Reuse files across multiple apps

The overrides are merged into the manifest during deployment and take precedence over local files.

## 📁 File Structure

```
├── .github/
│   └── workflows/
│       ├── auto-merge.yml    # Auto-merge agent PRs
│       ├── deploy.yml        # Deploy to Arweave
│       └── announce.yml      # Discord deployment announcements
├── apps/                    # Your applications (examples)
│   ├── web-app/            # Example web application
│   ├── static-site/        # Example static site
│   ├── simple-file/        # Example single file
│   └── ...                 # Your other apps
├── lib/
│   ├── arns.js              # ArNS utilities
│   ├── arweave.js           # Arweave/Turbo utilities
│   ├── logging.js           # Deployment logging system
│   ├── utils.js             # General utilities
│   ├── manifest-manager.js  # Per-app manifest and hash-based change detection
│   ├── git-tracker.js       # Git commit info and file hashing utilities
│   └── incremental-deploy.js # Incremental deployment logic
├── logs/
│   └── deployments.json     # Structured deployment logs with rolling history (committed to repo)
├── secrets/
│   └── wallet.json          # Arweave wallet (keep secure!)
├── deploy.js                # Main deployment script
├── env.example              # Environment variables template
├── docs/
│   ├── REMOTE_AGENT_SETUP.md    # Detailed setup guide
│   ├── WORKFLOW_DOCUMENTATION.md # Workflow documentation
│   └── INCREMENTAL_ARWEAVE_DEPLOYMENT.md # Technical documentation
└── README.md                # This file
```

## 📦 Dependencies

- `@ardrive/turbo-sdk`: Arweave uploads with fiat payments
- `@ar.io/sdk`: ArNS management and ANT integration
- `dotenv`: Environment variable management
- `crypto`: Built-in Node.js crypto for hash generation

## 🔒 Security Notes

- **Never commit secrets to git** - Your `.gitignore` is correctly configured
- **Use environment variables** - More secure than file-based secrets
- **Rotate keys regularly** - Especially for production deployments
- **Use different wallets** - Separate wallets for different environments
- **GitHub Secrets** - Store sensitive data in GitHub repository secrets
## 📊 Example Output

```
🚀 Starting deployment for: your-file.txt
📝 Using provided content (20 Bytes)
🔑 Generated commit hash: aec46ab7485ec172...
☁️ Uploading to Arweave...
✅ Uploaded to Arweave: abc123...def456
📝 Creating ArNS record: aec46ab7485ec172 → abc123...def456
✅ ArNS record created: xyz789...

🎉 Deployment complete!
   File: your-file.txt
   Commit: aec46ab7485ec172
   TX ID: abc123...def456
   ArNS: aec46ab7485ec172 (expires in 0 days)
   Size: 20 Bytes
   Duration: 3ms

📋 Logging deployment results...
📝 Logged to JSON: logs/deployments.json
✅ Deployment logged successfully
```

## 🤖 AI Agent Integration

This system is designed for seamless AI agent workflows:

### AI Agent Quick Reference
**📋 For detailed workflow documentation, see [docs/WORKFLOW_DOCUMENTATION.md](./docs/WORKFLOW_DOCUMENTATION.md)**

**Essential Commands for AI Agents:**
```bash
# Deploy files/directories
node deploy.js --file path/to/your/file.html
node deploy.js --file path/to/your/app/

# Deploy content directly
node deploy.js --content "Your content here"

# Test before deploying
node deploy.js --test-mode --file path/to/your/app/

# Check deployment status
node deploy.js --logs
node deploy.js --stats
```

**AI Workflow Checklist:**
1. **Make Updates Requested** - Analyze and implement changes
2. **Test If Appropriate** - Verify functionality works as expected  
3. **Deploy** - Deploy changes to target environment
4. **Announce (If Prompted)** - Use Discord announcement feature AFTER successful deploy

### GitHub Actions Integration
- **Auto-merge workflow** automatically merges agent PRs after validation
- **Smart deployment triggering** - only deploys when `apps/` directory changes are detected
- **Deploy workflow** automatically deploys merged changes to Arweave (when triggered)
- **Draft PR handling** automatically marks draft PRs as ready for review
- **Resource optimization** - skips unnecessary deployments when no app changes exist

### Agent Workflow
```javascript
// Example agent workflow
1. Agent creates branch: cursor/feature-branch
2. Agent makes changes to files
3. Agent creates PR (auto-merge handles the rest)
4. GitHub Actions validates and merges
5. GitHub Actions checks for apps/ changes
6. If apps/ changes detected: GitHub Actions deploys to Arweave
7. If no apps/ changes: deployment skipped (saves resources)
8. Agent ready for next task
```

### AI-Specific Considerations
- **File Paths**: Always use relative paths from project root
- **Testing**: Use `--test-mode` to verify deployments before real uploads
- **Error Handling**: Check logs with `--logs` if deployments fail
- **Incremental Deployments**: System automatically detects changes in directories
- **Content Deployment**: Use `--content` for simple text/HTML content
- **Environment**: Ensure all required environment variables are set

## 🔧 Troubleshooting

### General Issues
- **Upload fails**: Check Turbo balance and wallet configuration
- **ArNS fails**: Verify ANT_PROCESS_ID and wallet permissions
- **Auto-merge fails**: Check if PR is in draft status (workflow handles this automatically)
- **TTL issues**: Ensure ARNS_UNDERNAME_TTL is set to 60 seconds

### Incremental Deployment Issues

**All files re-upload on every deployment:**
- Check that deployment-tracker.json exists and has fileHashes
- Verify the tracker has version "1.0.0" (optimized structure)
- Verify GitHub workflow is committing tracker files back to repo
- Ensure app directory has proper permissions

**Files not detected as changed:**
- Hash-based detection is deterministic - same content = same hash
- If you expect changes but they're not detected, check file content actually differs
- Delete deployment-tracker.json to force a full redeployment

**Manifest has wrong TXIDs:**
- Ensure GitHub workflow commits manifest.json and deployment-tracker.json back to repo
- Check the "Update deployment logs" step in deploy workflow
- Verify git push succeeds in GitHub Actions logs

**State gets out of sync:**
- The deployment-tracker.json and manifest.json must be committed after each deployment
- If they're not in git, the next deployment won't know what was previously deployed
- Solution: Our workflow now automatically commits these files back to repo

**Old deployment-tracker.json structure:**
- The system automatically migrates old tracker files to the optimized structure
- If you see version "1.0.0" in your tracker, it's using the optimized format
- Old trackers are automatically converted on first use

**File operations (rename/move/delete) not working:**
- The system now automatically handles file renames, moves, and deletions
- Deleted files are removed from the manifest automatically
- Renamed files are detected as deletion + new file (both operations handled)
- If issues persist, check that files are properly git-tracked before deployment

## 📈 Monitoring & Logs

- **GitHub Actions**: Monitor workflow runs in the Actions tab
- **Deployment Logs**: Check `logs/deployments.json` for recent deployment history
- **Statistics**: Run `npm run stats` to see deployment metrics
- **Real-time**: Watch GitHub Actions for live deployment status

### How Discord Announcements Work

The Discord announcement system automatically gets deployment information:

1. **Local Deployments**: Logs are written to `logs/deployments.json` locally
2. **GitHub Actions Deployments**: Logs are committed back to the repository
3. **Announce Workflow**: Reads the latest deployment from `logs/deployments.json`
4. **Discord Post**: Uses the actual Arweave deployment hash (undername) for the link

This ensures Discord announcements always use the correct deployment hash, whether deployed locally or via GitHub Actions.

## 🚀 Future Enhancements

This system can be extended with:
- **Batch deployments** for multiple files
- **Rollback capabilities** using deployment history
- **Webhook notifications** for deployment status
- **Multi-environment support** (staging/production)
- **Custom validation rules** for different file types
- **Selective untracked file inclusion** (with explicit allowlist)
- **Advanced file operation detection** (git mv detection)
- **Template system** for creating new apps
- **App discovery** and management features

## 📚 Documentation

- **[docs/REMOTE_AGENT_SETUP.md](./docs/REMOTE_AGENT_SETUP.md)** - Detailed setup instructions
- **[docs/WORKFLOW_DOCUMENTATION.md](./docs/WORKFLOW_DOCUMENTATION.md)** - Workflow documentation
- **[docs/INCREMENTAL_ARWEAVE_DEPLOYMENT.md](./docs/INCREMENTAL_ARWEAVE_DEPLOYMENT.md)** - Technical documentation
- **[env.example](./env.example)** - Environment variables template
- **GitHub Actions** - See `.github/workflows/` for workflow details

