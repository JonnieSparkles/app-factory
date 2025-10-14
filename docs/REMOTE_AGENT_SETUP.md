# Remote Agent Setup Guide

**Complete configuration for AI agents (Cursor, GitHub Actions, etc.)**

## Environment Variables

Set these in your environment (Cursor settings, GitHub Secrets, etc.):

### Core Configuration

```env
# Required ArNS Configuration
ANT_PROCESS_ID=your-arns-process-id
OWNER_ARNS_NAME=your-arns-name
WALLET_ADDRESS=your-wallet-address

# Wallet Configuration (choose one)
ARWEAVE_JWK_JSON={"kty":"RSA","e":"AQAB","n":"...","d":"..."}
# OR
ARWEAVE_WALLET_PATH=./secrets/wallet.json

# ArNS Configuration
ARNS_UNDERNAME_TTL=60
```

### Optional Configuration

```env
# Discord webhook (optional)
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# GitHub token (optional)
REPO_TOKEN=your_github_personal_access_token
```

## Testing Agent Access

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