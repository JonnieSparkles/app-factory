# Contributing to App-Factory

Thank you for your interest in contributing to App-Factory! This document provides guidelines for contributing to the project.

## Quick Start

1. **Fork and clone** the repository
2. **Set up your environment** - See [Setup Guide](./docs/REMOTE_AGENT_SETUP.md) for complete configuration
3. **Install dependencies**: `npm install`
4. **Test your setup**: `node deploy.js --test-mode`

## Development Workflow

### Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly using the test mode: `node deploy.js --test-mode`
4. Write clear commit messages
5. Submit a pull request

### Testing Guidelines

- Always test with `--test-mode` before submitting changes
- Test both single file and directory deployments
- Verify dynamic deployment behavior (hash-based change detection)
- Check that tracking files are properly generated

### Pull Request Guidelines

- **Clear description** of what the PR does
- **Reference any issues** being fixed
- **Test results** - confirm `--test-mode` passes
- **Documentation updates** if adding new features
- **Breaking changes** must be clearly documented

## Code Standards

### General Guidelines

- Follow existing code style and patterns
- Add comments for complex logic
- Use meaningful variable and function names
- Handle errors gracefully with user-friendly messages

### File Organization

- Core logic goes in `/lib/` directory
- Keep modules focused and single-purpose
- Use consistent async/await patterns
- Maintain the existing error handling approach

## Project Structure

```
├── lib/                    # Core modules
│   ├── dynamic-deploy.js   # Main deployment class
│   ├── manifest-manager.js # Manifest operations
│   ├── arweave.js         # Arweave/Turbo SDK integration
│   ├── arns.js            # ArNS record management
│   ├── git-tracker.js     # Git operations and hashing
│   └── utils.js           # Shared utilities
├── apps/                  # Example applications
├── docs/                  # Documentation
└── .github/workflows/     # GitHub Actions automation
```

## Key Components

### Dynamic Deployment System

The core innovation is hash-based change detection:
- Uses `git hash-object` for deterministic file change detection
- Only uploads changed files to Arweave (90%+ cost savings)
- Works with shallow git clones (CI/CD compatible)
- Maintains `deployment-tracker.json` for state management

### GitHub Actions Integration

Three automated workflows:
- **auto-merge.yml** - Validates and merges agent PRs
- **deploy.yml** - Deploys changes using dynamic detection
- **announce.yml** - Discord notifications

## Environment Setup

See [Setup Guide](./docs/REMOTE_AGENT_SETUP.md) for:
- Environment variable configuration
- Wallet setup and security
- GitHub Secrets configuration
- ArNS domain setup

## Questions?

- Check the [Technical Documentation](./docs/DYNAMIC_DEPLOYMENT.md) for implementation details
- Review [Edge Cases & Troubleshooting](./docs/DEPLOYMENT_SCENARIOS_AND_EDGE_CASES.md) for common issues
- Open an issue for questions or suggestions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
