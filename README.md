# Remote Agent Deployment System

A modular deployment pipeline for AI-driven development workflows. Designed for both refining existing applications and rapidly prototyping new ones.

## Core Value Proposition

This system is a pipeline of **modular, optional components** that work together:

1. **Remote Agent Integration** - Compatible with configurable agent branch prefix workflows for autonomous development
2. **Dynamic Deployment** - Only changed files are re-uploaded to Arweave, reducing costs and deployment time
3. **ArNS Smart Domains** - Assigns smart, human-readable subdomains on Arweave for each deployment (recommended for easier access and management)
4. **Announcement System** - Completed work is automatically announced with deployment details

## Full Agent Mode

Enables continuous development cycles for both refining existing sites/apps and creating new proofs-of-concept:

```
Prompt → Create → Push to Git → Publish to Arweave → Assign ArNS Domain → Announce → Repeat
```

The agent autonomously:
- Creates feature branches and implements changes
- Pushes to GitHub where auto-merge validates and merges PRs
- Triggers deployment to Arweave with permanent storage
- Assigns human-readable ArNS subdomains (commit-hash based)
- Announces completed deployments with live URLs
- Ready for next iteration

## Quick Start

1. Configure environment variables (see [Setup Guide](./docs/REMOTE_AGENT_SETUP.md))
2. Place your project(s) in `apps/` directory
3. Deploy:
   ```bash
   node deploy.js --file path/to/file.html          # Single file
   node deploy.js --file path/to/app/               # Directory (dynamic)
   ```
4. Or let the AI agent handle the workflow automatically

## Architecture

```
Local Development
    ↓
AI Agent → Branch → Changes → PR
    ↓
Auto-Merge (validates & merges)
    ↓
Deploy (dynamic: only changed files)
    ↓
Arweave (permanent storage)
    ↓
ArNS (subdomain: commit-hash_your-domain.ar.io)
    ↓
Announce (optional Discord notification)
```

## Key Components

All components are modular and optional:

- **Dynamic Deployment**: Hash-based change detection uploads only modified files
- **Auto-Merge Workflow**: Validates and merges agent PRs automatically (configurable branch prefix)
- **Conditional Triggering**: Only deploys when `apps/` directory changes
- **ArNS Integration**: Automatic subdomain assignment using commit hashes
- **Announcement System**: Posts deployment details to Discord

## Deployment Methods

### File Deployment
```bash
node deploy.js --file path/to/file.html
```
Deploys a single file to Arweave with ArNS subdomain.

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
6. ArNS record created with commit hash subdomain
7. Tracking files committed to repository

**Tracking Files** (auto-created):
- `manifest.json` - Arweave manifest with transaction IDs
- `deployment-tracker.json` - File hashes and deployment history

**Benefits:**
- First deployment: uploads all files
- Subsequent: uploads only changes (can save 90%+ costs)
- Works with shallow git clones
- Handles renames, moves, and deletions automatically

See [Dynamic Deployment Guide](./docs/DYNAMIC_DEPLOYMENT.md) for implementation details and standalone usage options.

## Environment Variables

Required:
```env
ANT_PROCESS_ID=your-ant-process-id
OWNER_ARNS_NAME=your-domain
WALLET_ADDRESS=your-wallet-address

# Wallet (choose one)
ARWEAVE_JWK_JSON={"kty":"RSA",...}
# OR
ARWEAVE_WALLET_PATH=./secrets/wallet.json
```

Optional:
```env
ARNS_UNDERNAME_TTL=60
TURBO_USE_SHARED_CREDITS=true  # Auto-use shared credit approvals

# GitHub Actions Configuration (Required for auto-merge)
TRUSTED_USERS=JonnieSparkles,AnotherUser  # Comma-separated list of trusted usernames
AGENT_BRANCH_PREFIX=cursor/  # Prefix for AI agent branches (auto-merge only processes these)
```

See [Setup Guide](./docs/REMOTE_AGENT_SETUP.md) for full configuration.

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
- Never commit wallet files to git (use .gitignore)
- Use environment variables for secrets
- Store sensitive values in GitHub Secrets for CI/CD
- Rotate deployment wallet keys regularly

### GitHub Secrets Configuration

For the auto-merge workflow to work, configure these secrets in your GitHub repository:

1. **Go to your repository** → Settings → Secrets and variables → Actions
2. **Add these repository secrets:**
   - `GITHUB_TOKEN` (usually auto-provided by GitHub)
   - `TRUSTED_USERS` - Comma-separated list of GitHub usernames who can trigger auto-merge
     - Example: `JonnieSparkles,AnotherUser,ThirdUser`
     - Only PRs from these users will be auto-merged
   - `AGENT_BRANCH_PREFIX` - Prefix for AI agent branches (optional, defaults to `cursor/`)
     - Example: `cursor/`, `ai/`, `bot/`, `agent/`
     - Only branches starting with this prefix will be auto-merged

## GitHub Actions Integration

Three workflows:

### Auto-Merge (`auto-merge.yml`)
- Validates agent PRs (configurable branch prefix)
- Automatically merges when checks pass
- Converts draft PRs to ready state
- Manual workflow dispatch option available

### Deploy (`deploy.yml`)
- Triggers on merge to main (if `apps/` changed)
- Uses dynamic deployment
- Commits tracking files back to repo

### Announce (`announce.yml`)
- Posts deployment details to Discord
- Manually triggered or called from deploy workflow

## AI Agent Workflow

The agent follows this sequence:

1. **Make Updates** - Implement requested changes
2. **Test** - Verify changes work (if appropriate)
3. **Deploy** - Run deployment command
4. **Announce** - Post completion notice (if requested)

**Commands Available:**
```bash
node deploy.js --file <path>        # Deploy file or directory
node deploy.js --content <text>     # Deploy content directly
node deploy.js --test-mode          # Dry run
node deploy.js --logs               # View history
```

The system automatically:
- Detects file vs directory
- Uses dynamic deployment for directories
- Creates ArNS records with commit-hash subdomains
- Logs all deployments

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
- **Deployment Logs**: `logs/deployments.json` with last 10 deployments
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

- [Remote Agent Setup](./docs/REMOTE_AGENT_SETUP.md) - Full configuration guide
- [Workflow Documentation](./docs/WORKFLOW_DOCUMENTATION.md) - Detailed workflow reference
- [Dynamic Deployment](./docs/DYNAMIC_DEPLOYMENT.md) - Full system and standalone usage
- [Environment Template](./env.example) - Variable reference

## Dependencies

- `@ardrive/turbo-sdk` - Arweave uploads with fiat payments
- `@ar.io/sdk` - ArNS management
- `dotenv` - Environment configuration