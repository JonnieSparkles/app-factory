# App-Factory Setup Guide

**How to connect your AI agent (Cursor, etc.) to this GitHub Actions-powered deployment pipeline**

This repository uses **GitHub Actions workflows** to provide automated deployment for AI agents. When you configure your agent to submit PRs to this repo, the GitHub Actions workflows will automatically validate, merge, and deploy your changes.

## How It Works

**AI Agent Workflow (Powered by GitHub Actions):**
```
Your AI Agent → Submit PR → GitHub Actions Auto-Merge → GitHub Actions Deploy → GitHub Actions Announce
```

1. **Agent submits PR** - Your AI agent creates a branch and submits a pull request
2. **Auto-merge workflow** - GitHub Actions validates and merges PRs from trusted agents
3. **Deploy workflow** - GitHub Actions deploys changes to Arweave (if apps/ directory changed)
4. **Announce workflow** - GitHub Actions posts results to Discord (optional)

**Manual Commands** (for direct CLI usage, not automated workflow):
The commands below are for manual deployment outside the GitHub Actions automation.

## Environment Variables

Set these in your environment (Cursor settings, GitHub Secrets, etc.):

### Core Configuration

```env
# Required ArNS Configuration
ANT_PROCESS_ID=your-arns-process-id
ROOT_ARNS_NAME=your-arns-name
WALLET_ADDRESS=your-wallet-address

# Wallet Configuration (choose one)
ARWEAVE_JWK_JSON={"kty":"RSA","e":"AQAB","n":"...","d":"..."}
# OR
ARWEAVE_WALLET_PATH=./secrets/wallet.json

# ArNS Configuration
ARNS_UNDERNAME_TTL=60
```

### Upload Tag Configuration

Customize upload tags using hierarchical `upload-tags.json` files. See [AR.IO tagging documentation](https://docs.ar.io/build/upload/tagging) for recommended tags.

**Global defaults**: `apps/upload-tags.json` (applies to all apps)
**App-specific**: `apps/{app-name}/upload-tags.json` (overrides global)

### Optional Configuration

```env
# Discord webhook (optional)
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# GitHub token (optional)
REPO_TOKEN=your_github_personal_access_token
```

## Testing Agent Access

Test if your agent can access the deployment commands:

```bash
# Check if environment variables are accessible
node -e "console.log('ANT_PROCESS_ID:', process.env.ANT_PROCESS_ID ? 'SET' : 'NOT SET')"

# Test deployment script
node deploy.js --test-mode

# Check deployment logs
node deploy.js --logs

# View deployment statistics
node deploy.js --stats
```

## Deployment Commands

Commands your AI agent can use once connected to this pipeline:

### Basic Commands

```bash
# Deploy with content
node deploy.js --content "Hello from AI agent!"

# Deploy specific file  
node deploy.js --file your-file.txt --content "Updated content"

# Test mode (no actual deployment)
node deploy.js --test-mode --file your-file.txt
```

### Advanced Commands

```bash
# Deploy with Discord announcement
node deploy.js --file your-file.txt --announce-discord

# Deploy with custom message
node deploy.js --content "New content" --message "Agent update"

# View deployment logs
node deploy.js --logs

# View deployment statistics  
node deploy.js --stats
```

## Logging System

The system logs deployments to `logs/deployments.json` with:
- Timestamp and success/failure status
- File path and content hash
- Arweave transaction ID and ArNS record
- Performance metrics and error messages

## Troubleshooting

### Common Issues
- **TTL errors**: Ensure `ARNS_UNDERNAME_TTL=60` is set
- **Upload fails**: Check Turbo balance and wallet configuration
- **ArNS fails**: Verify `ANT_PROCESS_ID` and wallet permissions

### Getting Help
- Check GitHub Actions logs for detailed error messages
- Review deployment logs in `logs/deployments.json`
- Run `node deploy.js --stats` to see deployment metrics
- See [README.md](../README.md) for more troubleshooting tips