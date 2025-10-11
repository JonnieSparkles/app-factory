# Remote Agent Setup Guide

## Environment Variables for Cursor Agent

To make your deployment system work with remote Cursor agents, you need to provide the required environment variables. Here are the options:

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

# Optional Configuration
ARNS_UNDERNAME_TTL=60
APP_NAME=RemoteAgentDeploy
```

### Option 2: GitHub Secrets (for GitHub Actions)
If using GitHub Actions, add these as repository secrets:
- `ANT_PROCESS_ID`
- `OWNER_ARNS_NAME` 
- `WALLET_ADDRESS`
- `ARWEAVE_JWK_JSON`

### Option 3: Cloud Environment Variables
For cloud platforms (Vercel, Netlify, etc.), set these in your platform's environment variable settings.

## Security Considerations

1. **Never commit secrets to git** - Your `.gitignore` is correctly configured
2. **Use environment variables** - More secure than file-based secrets
3. **Rotate keys regularly** - Especially for production deployments
4. **Use different wallets** - Separate wallets for different environments

## Testing Remote Agent Access

You can test if the agent has access to environment variables by running:

```bash
# Check if environment variables are accessible
node -e "console.log('ANT_PROCESS_ID:', process.env.ANT_PROCESS_ID ? 'SET' : 'NOT SET')"
```

## Deployment Commands for Remote Agents

Once environment variables are set, remote agents can use:

```bash
# Deploy with content
npm run deploy -- --content "Hello from remote agent!"

# Deploy specific file
npm run deploy -- --file hello-world.txt --content "Updated content"

# View deployment logs
npm run logs

# View deployment statistics  
npm run stats

# Dry run (test without actual deployment)
npm run deploy -- --dry-run
```

## Logging System

The system now logs all deployments to:
- `./logs/deployments.json` - Structured JSON logs
- `./logs/deployments.csv` - CSV format for analysis

Each deployment logs:
- Timestamp
- Success/failure status
- File path and content hash
- Arweave transaction ID
- ArNS undername
- File size and duration
- Error messages (if any)
