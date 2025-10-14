# AI Agent Workflow Documentation

## Standard Workflow Steps

When working with AI agents on this project, always follow these steps in order:

### 1. Make Updates Requested
- Analyze the user's request
- Identify files that need to be modified
- Make the necessary changes
- Ensure code quality and functionality

### 2. Test If Appropriate
- Test the changes locally when possible
- Verify functionality works as expected
- Check for any errors or issues
- Use test mode for deployment testing when needed

### 3. Deploy
- Deploy the changes to the target environment
- Use the appropriate deployment method
- Verify deployment was successful
- Check deployment logs for any issues

### 4. Announce (If Prompted)
- Only announce AFTER successful deployment
- Use the Discord announcement feature
- Ensure GitHub secrets are properly configured
- Verify announcement was posted successfully

## Implementation Details

### Testing Phase
```bash
# Test deployment in test mode
node deploy.js --test-mode --file <filename> --content "<content>"

# Test Discord connection
node deploy.js --test-discord

# Test with announcement (will fail without credentials)
node deploy.js --test-mode --announce-discord --file <filename>
```

### Deployment Phase
```bash
# Deploy with content
node deploy.js --file <filename> --content "<content>"

# Deploy with announcement
node deploy.js --file <filename> --content "<content>" --announce-discord

# Deploy and trigger GitHub Actions announcement
node deploy.js --file <filename> --content "<content>" --trigger-announcement
```

### Announcement Phase
```bash
# Direct Discord announcement
node scripts/announce.js <deployment_hash> <file_path>

# GitHub Actions announcement
node scripts/trigger-announcement.js <deployment_hash> <file_path>
```

## Environment Setup Requirements

### Required Environment Variables
```env
# ArNS Configuration
ANT_PROCESS_ID=your-arns-process-id
OWNER_ARNS_NAME=your-arns-name
WALLET_ADDRESS=your-wallet-address

# Wallet Configuration (Choose one)
ARWEAVE_JWK_JSON={"kty":"RSA","e":"AQAB","n":"...","d":"..."}
# OR
ARWEAVE_WALLET_PATH=./secrets/wallet.json

# Discord Configuration (for announcements)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

## Best Practices

1. **Always test before deploying** - Use test mode to verify changes
2. **Deploy before announcing** - Never announce before successful deployment
3. **Check credentials** - Ensure all required environment variables are set
4. **Monitor logs** - Check deployment and announcement logs for issues
5. **Handle errors gracefully** - Provide clear error messages and next steps

## Common Issues and Solutions

### Wallet Not Found
- Create `./secrets/wallet.json` with valid Arweave wallet
- Or set `ARWEAVE_JWK_JSON` environment variable

### Discord 401 Error
- Check Discord webhook URL is set correctly
- Verify tokens are valid and not expired

### Deployment Fails
- Check wallet has sufficient balance
- Verify ArNS configuration is correct
- Check network connectivity

### Announcement Fails
- Verify Discord webhook URL is configured
- Check if announcement is appropriate for the deployment type
- Ensure deployment was successful before attempting announcement