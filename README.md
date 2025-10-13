# Remote Agent Deployment System

A streamlined deployment system for AI agent workflows that deploys files and applications to Arweave with unique ArNS undernames, featuring **incremental deployment**, auto-merge GitHub Actions, and comprehensive logging.

## 🚀 Quick Start

1. **Set up environment variables** (see [docs/REMOTE_AGENT_SETUP.md](./docs/REMOTE_AGENT_SETUP.md))
2. **Deploy a file**:
   ```bash
   node deploy.js --file apps/hello-world/index.html
   ```
3. **Deploy a directory** (uses incremental deployment):
   ```bash
   node deploy.js --file apps/arcade/
   ```
4. **Or ask the AI agent to make changes** - it will automatically:
   - Create a branch and make changes
   - Create a PR (auto-merge enabled)
   - Deploy to Arweave with ArNS integration
5. **Monitor deployments** via logs and GitHub Actions

## Overview

This project enables AI agents and developers to:
1. **Deploy individual files** or entire directories to Arweave
2. **Smart deployment detection** - automatically uses incremental deployment for directories
3. **Deploy to Arweave** via Turbo SDK with fiat payments
4. **Create ArNS records** with unique undernames based on commit hashes
5. **Auto-merge PRs** via GitHub Actions for seamless workflow
6. **Monitor all deployments** with comprehensive logging
7. **🆕 Incremental deployment** - only upload changed files, saving costs and time

## 🏗️ Architecture

```
Files/Directories → Smart Deployment Detection → Arweave → ArNS Records
     ↓
AI Agent → Create Branch → Make Changes → Create PR → Auto-merge → Deploy → Arweave → ArNS Record
```

### Project Structure
```
apps/
├── portfolio/           # Portfolio app
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── manifest.json          # ← Per-app manifest (for directories)
│   └── deployment-tracker.json # ← Deployment history (for directories)
├── calculator/          # Calculator app
│   └── index.html
├── hello-world/         # Simple text app
│   └── index.txt
├── hello-anthony/       # Greeting app
│   └── index.html
└── celebration/         # Celebration page
    └── index.html
```

### Key Components

- **🤖 AI Agent Integration**: Seamless workflow with auto-merge GitHub Actions
- **⚡ Turbo SDK**: Handles Arweave uploads with fiat payments
- **🏷️ ArNS SDK**: Manages Arweave Name Service records with 60-second TTL
- **🔑 Commit Hash**: SHA-256 hash used as unique identifier for each deployment
- **📝 ArNS Undername**: Maps commit hash to Arweave transaction ID
- **📊 Logging System**: Comprehensive JSON/CSV logging of all deployments
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
7. **☁️ Deploy**: File uploaded to Arweave via Turbo SDK
8. **🏷️ ArNS Assignment**: Transaction ID assigned to undername (commit hash)
9. **📊 Logging**: Deployment logged to JSON/CSV files
10. **🐦 Announce**: Post deployment announcement to Twitter (if requested)
11. **🎉 Completion**: Agent ready for next task

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

# Application Configuration
APP_NAME=RemoteAgentDeploy
ARWEAVE_GATEWAY=https://arweave.net
```

## 🎯 Usage

### Deployment Commands

**Deploy files and directories:**

```bash
# Deploy a single file
node deploy.js --file apps/hello-world/index.html
node deploy.js --file my-app.html

# Deploy a directory (uses incremental deployment)
node deploy.js --file apps/arcade/
node deploy.js --file apps/calculator/

# Deploy content directly
node deploy.js --content "Hello, World!"

# Test deployment (no real upload)
node deploy.js --test-mode --file apps/arcade/

# Force full deployment (no incremental)
node deploy.js --no-incremental --file apps/arcade/

# View deployment logs and stats
node deploy.js --logs
node deploy.js --stats
```

### AI Agent Commands

**The agent knows how to use these deployment options:**

```bash
# Deploy specific files or directories
"Deploy the portfolio app"
"Update and deploy the hello-world app"
"Deploy the arcade directory"

# Deploy all files in apps directory
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
node deploy.js --file apps/hello-world/index.html
node deploy.js --file apps/arcade/

# Test mode (no real deployment)
node deploy.js --test-mode --file apps/arcade/

# View deployment logs
node deploy.js --logs

# View deployment statistics  
node deploy.js --stats
```

## 🚀 Incremental Deployment

The system now features **incremental deployment** - a cost and time-optimized approach that only uploads files that have actually changed since the last deployment.

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
apps/arcade/
├── index.html
├── style.css
├── app.js
├── manifest.json          # Arweave manifest with file IDs (auto-created)
└── deployment-tracker.json # Deployment history and git tracking (auto-created)
```

Single files don't need tracking files:
```
apps/hello-world/
└── index.txt              # Simple file deployment, no tracking needed
```

### Usage

Incremental deployment is **enabled by default for directories**:

```bash
# Deploy directory with incremental deployment (hash-based detection)
node deploy.js --file apps/arcade/

# Deploy directory with full deployment (all files, skip change detection)
node deploy.js --no-incremental --file apps/arcade/

# Deploy single file (always uses simple deployment)
node deploy.js --file apps/hello-world/index.html

# Test incremental deployment
node deploy.js --test-mode --file apps/arcade/
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
🚀 Starting incremental deployment for app: arcade
📝 Current commit: a1b2c3d4 - Add new feature
🔍 Last deployment commit: x9y8z7w6
🔍 Using hash-based change detection...
📝 File changed: index.html (modified)
📝 File changed: style.css (modified)
🗑️ File deleted: old-game.html
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

## 📁 File Structure

```
├── .github/
│   └── workflows/
│       ├── auto-merge.yml    # Auto-merge agent PRs
│       ├── manual-merge.yml  # Manual merge workflow
│       └── deploy.yml        # Deploy to Arweave
├── apps/
│   ├── portfolio/           # Example apps
│   ├── calculator/
│   ├── hello-world/
│   └── ...                  # More apps
├── lib/
│   ├── arns.js              # ArNS utilities
│   ├── arweave.js           # Arweave/Turbo utilities
│   ├── logging.js           # Deployment logging system
│   ├── utils.js             # General utilities
│   ├── manifest-manager.js  # Per-app manifest and hash-based change detection
│   ├── git-tracker.js       # Git commit info and file hashing utilities
│   └── incremental-deploy.js # Incremental deployment logic
├── logs/
│   ├── deployments.json     # Structured deployment logs (committed to repo)
│   └── deployments.csv      # CSV deployment logs (committed to repo)
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
🚀 Starting deployment for: hello-world.txt
📝 Using provided content (20 Bytes)
🔑 Generated commit hash: aec46ab7485ec172...
☁️ Uploading to Arweave...
✅ Uploaded to Arweave: abc123...def456
📝 Creating ArNS record: aec46ab7485ec172 → abc123...def456
✅ ArNS record created: xyz789...

🎉 Deployment complete!
   File: hello-world.txt
   Commit: aec46ab7485ec172
   TX ID: abc123...def456
   ArNS: aec46ab7485ec172 (expires in 0 days)
   Size: 20 Bytes
   Duration: 3ms

📋 Logging deployment results...
📊 Logged to CSV: logs/deployments.csv
📝 Logged to JSON: logs/deployments.json
✅ Deployment logged successfully
```

## 🤖 AI Agent Integration

This system is designed for seamless AI agent workflows:

### Standard Workflow Steps
**📋 For detailed workflow documentation, see [docs/WORKFLOW_DOCUMENTATION.md](./docs/WORKFLOW_DOCUMENTATION.md)**

1. **Make Updates Requested** - Analyze and implement changes
2. **Test If Appropriate** - Verify functionality works as expected  
3. **Deploy** - Deploy changes to target environment
4. **Announce (If Prompted)** - Use Twitter announcement feature AFTER successful deploy

### GitHub Actions Integration
- **Auto-merge workflow** automatically merges agent PRs after validation
- **Deploy workflow** automatically deploys merged changes to Arweave
- **Draft PR handling** automatically marks draft PRs as ready for review

### Agent Workflow
```javascript
// Example agent workflow
1. Agent creates branch: cursor/feature-branch
2. Agent makes changes to files
3. Agent creates PR (auto-merge handles the rest)
4. GitHub Actions validates and merges
5. GitHub Actions deploys to Arweave
6. Agent ready for next task
```

## 🔧 Troubleshooting

### General Issues
- **Upload fails**: Check Turbo balance and wallet configuration
- **ArNS fails**: Verify ANT_PROCESS_ID and wallet permissions
- **Auto-merge fails**: Check if PR is in draft status (workflow handles this automatically)
- **TTL issues**: Ensure ARNS_UNDERNAME_TTL is set to 60 seconds

### Incremental Deployment Issues

**All files re-upload on every deployment:**
- Check that deployment-tracker.json exists and has fileHashes
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

**File operations (rename/move/delete) not working:**
- The system now automatically handles file renames, moves, and deletions
- Deleted files are removed from the manifest automatically
- Renamed files are detected as deletion + new file (both operations handled)
- If issues persist, check that files are properly git-tracked before deployment

## 📈 Monitoring & Logs

- **GitHub Actions**: Monitor workflow runs in the Actions tab
- **Deployment Logs**: Check `logs/deployments.json` and `logs/deployments.csv`
- **Statistics**: Run `npm run stats` to see deployment metrics
- **Real-time**: Watch GitHub Actions for live deployment status

### How Twitter Announcements Work

The Twitter announcement system automatically gets deployment information:

1. **Local Deployments**: Logs are written to `logs/deployments.json` locally
2. **GitHub Actions Deployments**: Logs are committed back to the repository
3. **Announce Workflow**: Reads the latest deployment from `logs/deployments.json`
4. **Twitter Post**: Uses the actual Arweave deployment hash (undername) for the link

This ensures Twitter announcements always use the correct deployment hash, whether deployed locally or via GitHub Actions.

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
