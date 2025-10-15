# App-Factory (Dynamic Agentic Deployment System)

A modular deployment pipeline that lets AI agents and developers autonomously manage and refine applications via PR-based workflows. Designed for rapid prototyping and seamless updates, it features dynamic deployments where only changed files are uploaded to Arweave. Compatible with any AI agent or tool that can submit pull requests.

## Core Value Proposition

This system is a pipeline of **modular, optional components** that work together:

1. **App-Factory Integration** - Compatible with any AI agent that can submit PRs with configurable branch prefix workflows
2. **[Dynamic Deployment](./docs/DYNAMIC_DEPLOYMENT.md)** - Only changed files are re-uploaded to Arweave, reducing costs and deployment time
3. **ArNS Smart Domains** - Assigns smart, human-readable undernames on Arweave for each deployment (recommended for easier access and management)
4. **Announcement System** - Completed work is automatically announced with deployment details

## Full Agent Mode (Automated via GitHub Actions)

Enables continuous development cycles where AI agents submit PRs for both refining existing sites/apps and creating new proofs-of-concept. **The automation happens through GitHub Actions workflows:**

```
AI Agent → Create → Submit PR → GitHub Actions Auto-Merge → GitHub Actions Deploy → GitHub Actions Announce → Ready for Next Task
```

The connected AI agent autonomously:
- Creates feature branches and implements changes
- Pushes to GitHub where **GitHub Actions auto-merge workflow** validates and merges PRs
- **GitHub Actions deploy workflow** triggers deployment to Arweave with permanent storage
- Assigns human-readable ArNS undernames (commit-hash based)
- **GitHub Actions announce workflow** announces completed deployments with live URLs
- Ready for next iteration

## Quick Start

**Three ways to use this system:**

### 1. **Manual Deployment** (Direct CLI)
```bash
node deploy.js --file path/to/file.html          # Single file
node deploy.js --file path/to/app/               # Directory (dynamic)
```

### 2. **AI Agent Automation** (GitHub Actions Powered)
Configure your AI agent to submit PRs to this repo - GitHub Actions handle validation, merging, and deployment automatically

### 3. **Standalone Dynamic Engine** 
Use just the deployment engine in your own projects (see [Dynamic Deployment Guide](./docs/DYNAMIC_DEPLOYMENT.md))

---

**For AI Agent setup:**
1. Configure environment variables (see [Setup Guide](./docs/REMOTE_AGENT_SETUP.md))
2. Place your project(s) in `apps/` directory
3. Connect your AI agent to submit PRs - GitHub Actions handle the rest

## Architecture

```
Local Development
    ↓
AI Agent → Branch → Changes → Submit PR
    ↓
Auto-Merge (validates & merges)
    ↓
Deploy (dynamic: only changed files)
    ↓
Arweave (permanent storage)
    ↓
ArNS (undername: commit-hash_your-domain.ar.io)
    ↓
Announce (optional Discord notification)
```

## Key Components

All components are modular and optional:

- **Dynamic Deployment**: Hash-based change detection uploads only modified files
- **Auto-Merge Workflow**: Validates and merges agent PRs automatically (configurable branch prefix)
- **Conditional Triggering**: Only deploys when `apps/` directory changes
- **ArNS Integration**: Automatic undername assignment using commit hashes
- **Announcement System**: Posts deployment details to Discord

## Deployment Methods

### File Deployment
```bash
node deploy.js --file path/to/file.html
```
Deploys a single file to Arweave with ArNS undername.

### Directory Deployment (Dynamic)
```bash
node deploy.js --file path/to/app/
```
Automatically uses dynamic deployment:
- Calculates SHA-256 hash for each file
- Compares with previous deployment hashes
- Uploads only changed files
- Updates manifest and creates ArNS record
- Commits tracking files back to repo

### Direct Content
```bash
node deploy.js --content "Hello, World!"
```

### Options
```bash
--test-mode           # Dry run, no uploads
--no-dynamic      # Force full directory upload
--logs                # View deployment history
--stats               # View deployment statistics
```

## Dynamic Deployment Details

**How it Works:**
1. Directory is scanned for git-tracked files only (security)
2. SHA-256 hash calculated for each file
3. Hashes compared with `deployment-tracker.json`
4. Only changed files uploaded to Arweave
5. Manifest updated and uploaded
6. ArNS record created with commit hash undername
7. Tracking files committed to repository

**Tracking Files** (auto-created):
- `manifest.json` - Arweave manifest with transaction IDs
- `deployment-tracker.json` - File hashes and deployment history

**Benefits:**
- First deployment: uploads all files
- Subsequent: uploads only changes (can save 90%+ costs)
- Works with shallow git clones
- Handles renames, moves, and deletions automatically

See [Technical Documentation](./docs/DYNAMIC_DEPLOYMENT.md) for implementation details.

## Environment Variables

See [Setup Guide](./docs/REMOTE_AGENT_SETUP.md) for complete configuration.

## Security

**Wallet Pattern for Operational Security:**

For production deployments, share credits from a secure primary wallet to a dedicated deployment wallet. This limits exposure:

```bash
# From secure wallet: approve credit sharing
# Deployment wallet: automatically uses shared credits when available
TURBO_USE_SHARED_CREDITS=true
```

Keep your primary wallet offline. The deployment wallet has limited revokable funds and can be rotated regularly.

**General Security:**
- Never commit wallet files to git
- Use environment variables for secrets
- Store sensitive values in GitHub Secrets for CI/CD
- Rotate deployment wallet keys regularly

### GitHub Secrets Configuration

Configure repository secrets for auto-merge:
- `TRUSTED_USERS` - Comma-separated GitHub usernames for auto-merge
- `AGENT_BRANCH_PREFIX` - Branch prefix for AI agents (default: `cursor/`)

See [Setup Guide](./docs/REMOTE_AGENT_SETUP.md) for complete list.

## GitHub Actions Integration

**These three workflows power the AI agent automation:**

### Auto-Merge (`auto-merge.yml`)
- **Validates AI agent PRs** (configurable branch prefix like `cursor/`)
- Automatically merges when checks pass
- Converts draft PRs to ready state
- Manual workflow dispatch option available

### Deploy (`deploy.yml`)
- **Triggers automatically** after auto-merge (if `apps/` changed)
- Uses dynamic deployment (only changed files)
- Commits tracking files back to repo

### Announce (`announce.yml`)
- **Posts deployment results** to Discord automatically
- Manually triggered or called from deploy workflow

**This is how AI agents get full automation** - they just submit PRs and the workflows handle everything else.

## AI Agent Integration

**This system is designed to work with AI agents through GitHub Actions automation:**

1. **Connect Your Agent** - Configure your AI agent (Cursor, etc.) to submit PRs to this repo
2. **Automated Processing** - GitHub Actions workflows validate and auto-merge PRs from trusted agents  
3. **Deploy Changes** - GitHub Actions automatically deploy merged changes to Arweave
4. **Announce Results** - GitHub Actions optionally post deployment details

**Commands for manual deployment (when not using GitHub Actions automation):**
```bash
node deploy.js --file <path>     # Deploy file/directory
node deploy.js --test-mode       # Dry run
node deploy.js --logs            # View history
node deploy.js --stats           # Deployment statistics
```

### Auto-Deploy Behavior (GitHub Actions)
- **Apps changes**: When agent submits PR with apps/ changes → GitHub Actions auto-merge → GitHub Actions deploy workflow triggered
- **Non-app changes**: When agent submits PR with only docs/etc → GitHub Actions auto-merge only, no deployment
- **Manual trigger**: Repository owner can deploy all apps regardless of changes using GitHub Actions or CLI

## Project Structure

```
├── .github/workflows/
│   ├── auto-merge.yml           # Auto-merge agent PRs
│   ├── deploy.yml               # Deploy to Arweave
│   └── announce.yml             # Discord announcements
├── apps/                        # Your applications
│   └── example-app/
│       ├── index.html
│       ├── manifest.json        # Auto-created for directories
│       └── deployment-tracker.json  # Auto-created for directories
├── lib/                         # Core modules
├── logs/
│   └── deployments.json         # Deployment history (rolling)
├── deploy.js                    # Main deployment script
└── docs/                        # Documentation
```

## Monitoring

- **GitHub Actions**: Real-time workflow status
- **Deployment Logs**: `logs/deployments.json` with last 50 deployments
- **Statistics**: `node deploy.js --stats`

## Troubleshooting

**All files re-upload every time:**
- Verify `deployment-tracker.json` exists and contains `fileHashes`
- Check GitHub workflow commits tracking files back to repo

**Files not detected as changed:**
- Hash-based detection is deterministic (same content = same hash)
- Delete `deployment-tracker.json` to force full redeployment

**Manifest has wrong transaction IDs:**
- Ensure GitHub workflow successfully commits and pushes tracking files
- Check "Update deployment logs" step in workflow logs

**Upload fails:**
- Check Turbo balance
- Verify wallet configuration
- Enable shared credits if available

**ArNS fails:**
- Verify `ANT_PROCESS_ID` is correct
- Check wallet has ANT permissions

See [Setup Guide](./docs/REMOTE_AGENT_SETUP.md) for detailed troubleshooting.

## Documentation

- [AI Setup Guide](./docs/REMOTE_AGENT_SETUP.md) - Complete AI configuration
- [Dynamic Deployment](./docs/DYNAMIC_DEPLOYMENT.md) - How dynamic deployment works
- [Edge Cases & Troubleshooting](./docs/DEPLOYMENT_SCENARIOS_AND_EDGE_CASES.md) - Comprehensive deployment scenarios
- [Permaweb Deploy Integration Analysis](./docs/PERMAWEB_DEPLOY_INTEGRATION_ANALYSIS.md) - Analysis of integrating with permaweb-deploy, feature compatibility, and recommended strategies
- [SHA-256 vs IPFS CID Analysis](./docs/SHA256_VS_IPFS_CID_ANALYSIS.md) - Technical comparison of SHA-256 vs IPFS CID for change detection and manifests
- [Future Work](./docs/FUTURE_WORK.md) - Planned enhancements, known limitations, and workarounds

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Dependencies

- `@ardrive/turbo-sdk` - Arweave uploads with fiat payments
- `@ar.io/sdk` - ArNS name system management
- `isomorphic-git` - Pure JavaScript Git implementation (no Git CLI required)
- `@octokit/rest` - GitHub API client (no GitHub CLI required)
- `dotenv` - Environment configuration

**Note:** This system no longer requires Git CLI or GitHub CLI to be installed. All Git and GitHub operations are handled through pure JavaScript libraries.