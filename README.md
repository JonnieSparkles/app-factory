# Remote Agent Deployment System

A complete system for AI agent workflows that automatically deploys edited files to Arweave with unique ArNS undernames, featuring auto-merge GitHub Actions and comprehensive logging.

## 🚀 Quick Start

1. **Set up environment variables** (see [REMOTE_AGENT_SETUP.md](./REMOTE_AGENT_SETUP.md))
2. **Ask the AI agent to make changes** - it will automatically:
   - Create a branch and make changes
   - Create a PR (auto-merge enabled)
   - Deploy to Arweave with ArNS integration
3. **Monitor deployments** via logs and GitHub Actions

## Overview

This project enables AI agents to:
1. **Edit files** (like `hello-world.txt`) with automatic versioning
2. **Deploy to Arweave** via Turbo SDK with fiat payments
3. **Create ArNS records** with unique undernames based on commit hashes
4. **Auto-merge PRs** via GitHub Actions for seamless workflow
5. **Track all deployments** with comprehensive logging

## 🏗️ Architecture

```
AI Agent → Create Branch → Make Changes → Create PR → Auto-merge → Deploy to Arweave → Create ArNS Record
```

### Key Components

- **🤖 AI Agent Integration**: Seamless workflow with auto-merge GitHub Actions
- **⚡ Turbo SDK**: Handles Arweave uploads with fiat payments
- **🏷️ ArNS SDK**: Manages Arweave Name Service records with 60-second TTL
- **🔑 Commit Hash**: SHA-256 hash used as unique identifier for each deployment
- **📝 ArNS Undername**: Maps commit hash to Arweave transaction ID
- **📊 Logging System**: Comprehensive JSON/CSV logging of all deployments
- **🔄 Auto-merge**: GitHub Actions automatically merge agent PRs after validation

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

**📋 For detailed setup instructions, see [REMOTE_AGENT_SETUP.md](./REMOTE_AGENT_SETUP.md)**

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

### AI Agent Commands
```bash
# Ask the agent to update and deploy
"Update hello-world.txt to say 'Hello from the future!' and deploy it"

# Ask the agent to fix issues
"Fix the TTL configuration to use 30 seconds"

# Ask the agent to add features
"Add a command to show deployment history"
```

### Manual Deployment Commands
```bash
# Deploy with content
npm run deploy -- --content "Hello from remote agent!"

# Deploy specific file
npm run deploy -- --file hello-world.txt --content "Updated content"

# Test mode (no real deployment)
npm run deploy -- --test-mode

# View deployment logs
npm run logs

# View deployment statistics  
npm run stats
```

## 📁 File Structure

```
├── .github/
│   └── workflows/
│       ├── auto-merge.yml    # Auto-merge agent PRs
│       ├── manual-merge.yml  # Manual merge workflow
│       └── deploy.yml        # Deploy to Arweave
├── lib/
│   ├── arns.js              # ArNS utilities
│   ├── arweave.js           # Arweave/Turbo utilities
│   ├── logging.js           # Deployment logging system
│   └── utils.js             # General utilities
├── logs/
│   ├── deployments.json     # Structured deployment logs
│   └── deployments.csv      # CSV deployment logs
├── secrets/
│   └── wallet.json          # Arweave wallet (keep secure!)
├── hello-world.txt          # Example target file
├── deploy.js                # Main deployment script
├── env.example              # Environment variables template
├── REMOTE_AGENT_SETUP.md    # Detailed setup guide
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
**📋 For detailed workflow documentation, see [WORKFLOW_DOCUMENTATION.md](./WORKFLOW_DOCUMENTATION.md)**

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

- **Upload fails**: Check Turbo balance and wallet configuration
- **ArNS fails**: Verify ANT_PROCESS_ID and wallet permissions
- **Auto-merge fails**: Check if PR is in draft status (workflow handles this automatically)
- **TTL issues**: Ensure ARNS_UNDERNAME_TTL is set to 60 seconds
- **Hash collision**: Extremely unlikely with SHA-256, but system handles gracefully

## 📈 Monitoring & Logs

- **GitHub Actions**: Monitor workflow runs in the Actions tab
- **Deployment Logs**: Check `logs/deployments.json` and `logs/deployments.csv`
- **Statistics**: Run `npm run stats` to see deployment metrics
- **Real-time**: Watch GitHub Actions for live deployment status

## 🚀 Future Enhancements

This system can be extended with:
- **Batch deployments** for multiple files
- **Rollback capabilities** using deployment history
- **Webhook notifications** for deployment status
- **Multi-environment support** (staging/production)
- **Custom validation rules** for different file types

## 📚 Documentation

- **[REMOTE_AGENT_SETUP.md](./REMOTE_AGENT_SETUP.md)** - Detailed setup instructions
- **[env.example](./env.example)** - Environment variables template
- **GitHub Actions** - See `.github/workflows/` for workflow details
