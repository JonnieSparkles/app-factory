# Quick Deployment Reference

## 🚀 Deploy Calculator with Theme Switcher

### Test Mode (No Setup Required)
```bash
# Test the calculator deployment
node deploy.js --app calculator --test-mode

# Test with specific file
node deploy.js --file apps/calculator/index.html --test-mode
```

### Real Deployment (Requires Environment Setup)
```bash
# Deploy calculator app
node deploy.js --app calculator

# Deploy with GitHub Actions (if secrets configured)
node deploy.js --app calculator --trigger-github-deploy
```

## 📱 Available Apps
```bash
# List all apps
node deploy.js --list-apps

# Deploy specific app
node deploy.js --app <app-id>
```

## 🔍 Testing & Debugging
```bash
# View deployment logs
node deploy.js --logs

# View deployment stats
node deploy.js --stats

# Test social media connections
node deploy.js --test-twitter
node deploy.js --test-discord
```

## 🎨 Theme Switcher Features

The calculator now includes:
- ✅ Light/Dark mode toggle button (🌙/☀️)
- ✅ CSS variables for consistent theming
- ✅ localStorage persistence
- ✅ Smooth transitions
- ✅ Responsive design

## 🔧 Environment Setup (If Needed)

If you want real deployments, set these environment variables:

```bash
# Required for Arweave deployment
ANT_PROCESS_ID=your-arns-process-id
OWNER_ARNS_NAME=your-arns-name
WALLET_ADDRESS=your-wallet-address
ARWEAVE_JWK_JSON={"kty":"RSA","e":"AQAB","n":"...","d":"..."}

# Optional: Social media
TWITTER_APP_KEY=your_key
TWITTER_APP_SECRET=your_secret
DISCORD_WEBHOOK_URL=your_webhook_url
```

## 📊 Current Status

- ✅ Calculator app updated with theme switcher
- ✅ All dependencies installed
- ✅ Test mode working perfectly
- ✅ GitHub Actions configured
- ⏳ Real deployment requires environment setup