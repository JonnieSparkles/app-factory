# Incremental Arweave Deployment with Git

## Overview
A system for deploying only changed files to Arweave using git-based change detection, saving costs and time by avoiding full deployments.

## Core Concept
Instead of calculating file hashes, leverage git's existing change tracking to determine which files actually changed since the last deployment.

## How It Works

### 1. Git-Based Change Detection
- Use `git diff --name-only <last-deployment-tag> HEAD` to get changed files
- Git only returns files where content actually changed
- Handles multiple commits between deployments correctly

### 2. True Incremental Deployment
- Deploy only files that actually changed content
- Pay only for files that actually changed
- Upload only files that actually changed
- Perfect cost and time optimization

## Git Commands for Change Detection

### Files Changed Since Last Deployment
```bash
# Compare with last deployment tag
git diff --name-only $(git describe --tags --abbrev=0) HEAD

# Compare with specific commit
git diff --name-only last-deployment-commit HEAD
```

### Working Directory Changes
```bash
# Files modified but not committed
git diff --name-only

# Files staged for commit
git diff --name-only --cached
```

## Deployment Strategies

### 1. Tag-Based Deployment (Recommended)
- Tag each deployment: `git tag -a "deploy-v1.0" -m "Deployed to Arweave"`
- Always deploy since last tag: `git diff --name-only deploy-v1.0 HEAD`
- Handles multiple commits between deployments automatically

### 2. Commit-Based Deployment
- Deploy files changed in specific commits
- Good for precise control over what gets deployed
- More complex but more granular

### 3. Working Directory Deployment
- Deploy only uncommitted changes
- Good for quick testing
- Risk of losing track of what's deployed

## Arweave Manifest Structure

```json
{
  "manifest": "arweave/paths",
  "version": "0.2.0",
  "index": {
    "path": "index.html"
  },
  "paths": {
    "index.html": {
      "id": "bnYTf5wGyZRWUxNHa8R8eENBe6iHcWi4SudmMfBkzRE"
    },
    "css/style.css": {
      "id": "xyz789...css-id"
    },
    "js/app.js": {
      "id": "abc123...js-id"
    }
  }
}
```

### Required Tags for Manifest
- `Content-Type: application/x.arweave-manifest+json`
- `Type: manifest`

## Workflow Example

### Timeline
- **Monday**: Deploy v1.0 (tagged)
- **Tuesday**: Commit "Add new feature" (changes 2 files)
- **Wednesday**: Commit "Fix bug" (changes 1 file)
- **Thursday**: Commit "Add styling" (changes 3 files)
- **Friday**: Deploy v1.1

### What Gets Deployed on Friday
```bash
git diff --name-only deploy-v1.0 HEAD
# Returns only files that actually changed:
# css/theme.css
# css/layout.css
# js/main.js
# images/hero.jpg
# components/header.js
```

### Result
- 5 files deployed (only changed ones)
- Updated manifest
- Total: 6 files instead of 100
- 94% cost savings

## Performance Benefits

### Git is Optimized
- Change detection in milliseconds for thousands of files
- Handles file renames, moves, and deletions correctly
- Scales to massive repositories
- No hash calculation needed

### Cost Optimization
- Only pay for files that actually changed
- Significant savings for small updates
- Faster deployments
- Less bandwidth usage

## Best Practices

### 1. Tag Every Deployment
- Creates deployment history
- Enables "deploy since last tag" workflow
- Easy to track what's deployed

### 2. Use Semantic Versioning
- Tag as v1.0, v1.1, v1.2
- Standard practice
- Easy to understand changes

### 3. Deploy Frequently
- Don't let too many commits accumulate
- Easier to debug issues
- Smaller, manageable deployments

### 4. Handle Edge Cases
- Check if in git repository
- Handle first deployment (no tags)
- Handle no changes detected

## Integration Points

### With Current Deploy System
- Add `--git` flag to deploy command
- Use git diff instead of hash calculation
- Everything else stays the same

### With CI/CD
- Git-based detection works in automated systems
- CI systems are already git-aware
- Natural fit for deployment pipelines

## Key Benefits

### True Incremental Deployment
- Deploy only what actually changed
- Never miss changes (git tracks everything)
- Handle multiple commits correctly
- Perfect cost and time optimization

### Git Integration
- Leverages existing git workflow
- No additional tools needed
- Handles complex scenarios automatically
- Scales to any repository size

## Implementation Notes

### File Structure
```
├── manifest.json              # Arweave manifest (committed)
├── .arweave-cache/           # Local cache (optional)
│   └── last-deployment.json  # Last deployment info
└── deploy-incremental.js     # Incremental deployment script
```

### Change Detection Logic
1. Get last deployment tag/commit
2. Run `git diff --name-only <last> HEAD`
3. Upload only changed files
4. Update manifest with new file IDs
5. Upload updated manifest
6. Tag new deployment

This system provides true incremental deployment by leveraging git's existing change tracking capabilities.
