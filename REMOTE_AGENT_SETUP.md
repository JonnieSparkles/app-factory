# Remote Agent Setup Guide

**📋 This is a detailed setup guide. For a quick overview, see [README.md](./README.md)**

## Environment Variables for AI Agents

To make your deployment system work with AI agents (Cursor, GitHub Actions, etc.), you need to provide the required environment variables. Here are the options:

### Option 1: Cursor Environment Variables (Recommended)
Set these in Cursor's environment settings:

```bash
# Required ArNS Configuration
ANT_PROCESS_ID=your-arns-process-id
OWNER_ARNS_NAME=your-arns-name
WALLET_ADDRESS=your-wallet-address

# Wallet Configuration (choose one)
# Option A: Raw JWK JSON (recommended for remote agents)
ARWEAVE_JWK_JSON={"kty":"RSA","e":"AQAB","n":"...","d":"..."}

# Option B: Wallet file path (if agent has access to your filesystem)
# ARWEAVE_WALLET_PATH=./secrets/wallet.json

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

### Option 2: GitHub Secrets (for GitHub Actions)
If using GitHub Actions, add these as repository secrets:
- `ANT_PROCESS_ID`
- `OWNER_ARNS_NAME` 
- `WALLET_ADDRESS`
- `ARWEAVE_JWK_JSON`
- `TURBO_PAYMENT_SERVICE_URL`
- `TURBO_UPLOAD_SERVICE_URL`

### Option 3: Cloud Environment Variables
For cloud platforms (Vercel, Netlify, etc.), set these in your platform's environment variable settings.

## 🤖 AI Agent Workflow

### How It Works
1. **You ask the AI agent** to make changes
2. **Agent creates branch** with `cursor/` prefix
3. **Agent makes changes** to files
4. **Agent creates PR** (may be draft initially)
5. **GitHub Actions auto-merge** validates and merges PR
6. **GitHub Actions deploy** automatically deploys to Arweave
7. **Agent ready** for next task

### Auto-merge Features
- ✅ **Validates deployment script** before merging
- ✅ **Handles draft PRs** automatically
- ✅ **Only affects `cursor/` branches** (agent-created PRs)
- ✅ **Squash merges** for clean history
- ✅ **Deletes branches** after merge

## Security Considerations

1. **Never commit secrets to git** - Your `.gitignore` is correctly configured
2. **Use environment variables** - More secure than file-based secrets
3. **Rotate keys regularly** - Especially for production deployments
4. **Use different wallets** - Separate wallets for different environments

## 🧪 Testing Agent Access

You can test if the agent has access to environment variables by running:

```bash
# Check if environment variables are accessible
node -e "console.log('ANT_PROCESS_ID:', process.env.ANT_PROCESS_ID ? 'SET' : 'NOT SET')"

# Test deployment script
npm run deploy -- --test-mode

# Check deployment logs
npm run logs

# View deployment statistics
npm run stats
```

## 🚀 Deployment Commands for AI Agents

Once environment variables are set, AI agents can use:

```bash
# Deploy with content
npm run deploy -- --content "Hello from AI agent!"

# Deploy specific file
npm run deploy -- --file hello-world.txt --content "Updated content"

# Deploy with custom commit message
npm run deploy -- --content "New content" --message "Agent update #1"

# Test mode (no real deployment)
npm run deploy -- --test-mode

# Dry run (test without actual deployment)
npm run deploy -- --dry-run

# View deployment logs
npm run logs

# View deployment statistics  
npm run stats
```

## 📊 Logging System

The system logs all deployments to:
- `./logs/deployments.json` - Structured JSON logs
- `./logs/deployments.csv` - CSV format for analysis

Each deployment logs:
- **Timestamp** - When the deployment occurred
- **Success/failure status** - Whether deployment succeeded
- **File path and content hash** - What was deployed
- **Arweave transaction ID** - The Arweave transaction
- **ArNS undername** - The ArNS record name
- **TTL** - Time to live (60 seconds)
- **File size and duration** - Performance metrics
- **Error messages** - If deployment failed

## 🔧 Troubleshooting

### Common Issues
- **TTL errors**: Ensure `ARNS_UNDERNAME_TTL=60` is set
- **Auto-merge fails**: Check if PR is in draft status (workflow handles this)
- **Upload fails**: Check Turbo balance and wallet configuration
- **ArNS fails**: Verify `ANT_PROCESS_ID` and wallet permissions

### Getting Help
- Check GitHub Actions logs for detailed error messages
- Review deployment logs in `logs/deployments.json`
- Run `npm run stats` to see deployment metrics
- See [README.md](./README.md) for more troubleshooting tips
