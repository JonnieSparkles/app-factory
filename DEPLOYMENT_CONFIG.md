# Deployment Configuration Guide

## Current Status
✅ **Dependencies Installed** - All npm packages are installed and working  
✅ **App Factory Working** - Can list and manage apps via `node deploy.js --list-apps`  
✅ **Test Mode Working** - Can test deployments with `--test-mode` flag  
❌ **Real Deployments Blocked** - Missing Arweave wallet and ArNS configuration  

## Required Environment Variables

The deployment system requires these environment variables to work for real deployments:

### Core Arweave Configuration
```bash
# Required for ArNS integration
ANT_PROCESS_ID=your-arns-process-id
OWNER_ARNS_NAME=your-arns-name
WALLET_ADDRESS=your-wallet-address

# Wallet Configuration (choose one)
ARWEAVE_JWK_JSON={"kty":"RSA","e":"AQAB","n":"...","d":"..."}
# OR
ARWEAVE_WALLET_PATH=./secrets/wallet.json

# ArNS Configuration
ARNS_UNDERNAME_TTL=60
DEFAULT_TTL_SECONDS=60
```

### Turbo Configuration
```bash
TURBO_PAYMENT_SERVICE_URL=https://payment.ardrive.dev
TURBO_UPLOAD_SERVICE_URL=https://upload.ardrive.dev
```

### Application Configuration
```bash
APP_NAME=RemoteAgentDeploy
ARWEAVE_GATEWAY=https://arweave.net
```

### Optional: Social Media Integration
```bash
# Twitter API
TWITTER_APP_KEY=your_app_key
TWITTER_APP_SECRET=your_app_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret

# Discord Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# GitHub API
REPO_TOKEN=your_github_personal_access_token
```

## Deployment Methods

### 1. Test Mode (No Configuration Required)
```bash
# Test any app deployment
node deploy.js --app calculator --test-mode

# Test file deployment
node deploy.js --file apps/calculator/index.html --test-mode
```

### 2. GitHub Actions (Uses Repository Secrets)
The repository has GitHub Actions workflows configured that will automatically deploy when:
- Files are pushed to `main` branch
- Manual workflow dispatch is triggered

**Workflow Files:**
- `.github/workflows/deploy.yml` - Main deployment workflow
- `.github/workflows/announce.yml` - Announcement workflow
- `.github/workflows/auto-merge.yml` - Auto-merge PRs from `cursor/` branches

**To Deploy via GitHub Actions:**
1. Push changes to main branch (auto-deploy)
2. Or trigger manual deployment via GitHub Actions UI
3. Or use: `node deploy.js --trigger-github-deploy` (requires env vars)

### 3. Local Deployment (Requires Environment Variables)
```bash
# Deploy specific app
node deploy.js --app calculator

# Deploy specific file
node deploy.js --file apps/calculator/index.html

# Deploy with content
node deploy.js --content "Hello World" --message "Test deployment"
```

## Current App Configuration

The system has these apps configured in `apps.json`:

| App ID | Name | Entry Point | Status |
|--------|------|-------------|--------|
| `calculator` | Mobile Calculator | `apps/calculator/index.html` | ✅ Ready |
| `portfolio` | Portfolio | `apps/portfolio/index.html` | ✅ Ready |
| `demo-app` | HTML App | `apps/demo-app/index.html` | ✅ Ready |
| `hello-world` | Hello World App | `deploy/hello-world.txt` | ✅ Ready |
| `hello-anthony` | Hello Anthony App | `deploy/hello-anthony.html` | ✅ Ready |
| `celebration` | Deployment Celebration | `deploy/index.html` | ✅ Ready |

## Quick Commands

### List Apps
```bash
node deploy.js --list-apps
```

### Test Deployment
```bash
node deploy.js --app calculator --test-mode
```

### View Logs
```bash
node deploy.js --logs
```

### View Stats
```bash
node deploy.js --stats
```

### Test Social Media
```bash
node deploy.js --test-twitter
node deploy.js --test-discord
```

## Troubleshooting

### Common Issues
1. **"ANT_PROCESS_ID environment variable is required"**
   - Solution: Set up Arweave wallet and ArNS configuration
   - Workaround: Use `--test-mode` for testing

2. **"Address already in use" (Python server)**
   - Solution: Use different port or kill existing process
   - Alternative: Use `--test-mode` to test without local server

3. **GitHub Actions not deploying**
   - Check: Repository secrets are configured
   - Check: Workflow files are in `.github/workflows/`
   - Check: Files are pushed to `main` branch

### Environment Setup Options

#### Option 1: Cursor Environment Variables
Set in Cursor's environment settings (recommended for AI agents)

#### Option 2: GitHub Secrets
Add to repository secrets for GitHub Actions deployment

#### Option 3: Local .env File
Create `.env` file in project root (not recommended for production)

## Next Steps for Full Deployment

1. **Get Arweave Wallet**: Create or import Arweave wallet
2. **Set up ArNS**: Register ArNS name and get process ID
3. **Configure Environment**: Set required environment variables
4. **Test Deployment**: Run real deployment (not test mode)
5. **Verify**: Check deployed app on Arweave

## Current Working Features

✅ App discovery and management  
✅ Test mode deployments  
✅ GitHub Actions workflow configuration  
✅ Theme switcher implementation  
✅ Calculator app with light/dark mode  
✅ Deployment logging system  
✅ Social media integration setup  

## Files Modified for Theme Switcher

- `apps/calculator/index.html` - Added theme switcher UI and functionality
- CSS variables for light/dark themes
- JavaScript theme management with localStorage persistence
- Theme switcher button with emoji icons (🌙/☀️)