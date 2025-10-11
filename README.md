# Remote Agent Deployment System

A system for testing remote agent workflows that automatically deploys edited files to Arweave with unique ArNS undernames based on commit hashes.

## Overview

This project enables remote agents to:
1. Edit files (like `hello-world.txt`)
2. Automatically deploy the edited content to Arweave via Turbo SDK
3. Assign each deployment a unique ArNS undername based on the commit hash
4. Track deployments and their corresponding ArNS records

## Architecture

```
Remote Agent → Edit File → Generate Commit Hash → Upload to Arweave → Create ArNS Record
```

### Key Components

- **Turbo SDK**: Handles Arweave uploads with fiat payments
- **ArNS SDK**: Manages Arweave Name Service records
- **Commit Hash**: Used as unique identifier for each deployment
- **ArNS Undername**: Maps commit hash to Arweave transaction ID

## Workflow

1. **File Edit**: Agent modifies target file (e.g., `hello-world.txt`)
2. **Hash Generation**: System generates commit hash from file content
3. **Arweave Upload**: File uploaded to Arweave via Turbo SDK
4. **ArNS Assignment**: Transaction ID assigned to undername (commit hash)
5. **Verification**: System verifies deployment and ArNS record creation

## Environment Setup

Create a `.env` file with the following variables:

```env
# Arweave Configuration
ARWEAVE_WALLET_PATH=./secrets/wallet.json
ARNS_CONTRACT_ID=your-arns-contract-id
ARNS_UNDERNAME_TTL=60

# Turbo Configuration
TURBO_PAYMENT_SERVICE_URL=https://payment.ardrive.dev
TURBO_UPLOAD_SERVICE_URL=https://upload.ardrive.dev

# Optional: Custom App Name
APP_NAME=RemoteAgentDeploy
```

## Usage

### Basic Deployment
```bash
npm run deploy -- --file hello-world.txt --content "New content here"
```

### With Custom Commit Message
```bash
npm run deploy -- --file hello-world.txt --content "Updated content" --message "Agent edit #1"
```

## File Structure

```
├── lib/
│   ├── arns.js          # ArNS utilities
│   ├── arweave.js       # Arweave/Turbo utilities
│   └── utils.js         # General utilities
├── secrets/
│   └── wallet.json      # Arweave wallet (keep secure!)
├── hello-world.txt      # Example target file
├── deploy.js            # Main deployment script
└── README.md
```

## Dependencies

- `@ardrive/turbo-sdk`: Arweave uploads with fiat payments
- `@ar-io/ar-io-sdk`: ArNS management
- `crypto`: Built-in Node.js crypto for hash generation

## Security Notes

- Keep your wallet file secure and never commit it to version control
- Use environment variables for sensitive configuration
- Consider using different wallets for different environments

## Example Output

```
☁️ Uploading 0.1KB to Arweave...
✅ Uploaded: abc123...def456 (0.000123 winc)
📝 Creating ArNS record: a1b2c3d4... → abc123...def456
✅ ArNS record created: xyz789...
🎉 Deployment complete!
   File: hello-world.txt
   Commit: a1b2c3d4...
   TX ID: abc123...def456
   ArNS: a1b2c3d4... (expires in 1 year)
```

## Remote Agent Integration

This system is designed to be called by remote agents via API or CLI:

```javascript
// Example agent call
const result = await deployFile({
  filePath: 'hello-world.txt',
  content: 'Agent edited content',
  commitMessage: 'Remote agent update'
});
```

## Troubleshooting

- **Upload fails**: Check Turbo balance and wallet configuration
- **ArNS fails**: Verify contract ID and wallet permissions
- **Hash collision**: Extremely unlikely with SHA-256, but system handles gracefully

## Contributing

This is a test project for remote agent workflows. Feel free to extend with additional features like:
- Batch deployments
- Rollback capabilities
- Deployment history tracking
- Webhook notifications
