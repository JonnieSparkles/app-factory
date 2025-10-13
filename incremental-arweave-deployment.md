# Incremental Arweave Deployment with Hash-Based Detection

## Overview
A simplified system for deploying only changed files to Arweave using hash-based change detection, saving costs and time by avoiding full deployments.

## Core Concept
Compare SHA-256 file hashes to determine which files have changed since the last deployment. This approach is deterministic, reliable, and independent of git history.

## How It Works

### 1. Hash-Based Change Detection
- Calculate SHA-256 hash for each file using `git hash-object`
- Compare current hashes with stored hashes from deployment-tracker.json
- Upload only files where hash has changed
- Store updated hashes for next deployment

### 2. True Incremental Deployment
- Deploy only files that actually changed content
- Pay only for files that changed
- Upload only files with different hashes
- Perfect cost and time optimization

## Hash Calculation

### File Hashing
```bash
# Calculate hash for a single file
git hash-object path/to/file.html

# Hash is deterministic
# Same content = Same hash = No re-upload
```

### Benefits of Hash-Based Detection
- **Deterministic**: Same file content always produces same hash
- **Git independent**: Works with shallow clones (fetch-depth: 1)
- **Reliable**: No merge conflicts or git history issues
- **Simple**: One code path, easy to debug

## Deployment Strategies

### Hash-Based (Current Implementation)
- Compare file hashes with deployment-tracker.json
- Upload files with changed hashes
- Update tracker with new hashes
- Works everywhere (local, CI, shallow clones)

## Arweave Manifest Structure

The manifest maintains Arweave transaction IDs for all files:

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

### Deployment Tracker Structure

Stores file hashes and deployment metadata:

```json
{
  "lastDeployCommit": "a1b2c3d4e5f6g7h8",
  "lastDeployed": "2025-10-13T12:00:00.000Z",
  "deploymentCount": 5,
  "fileHashes": {
    "index.html": "caec3826ccfb35618dc56489b7902f97a3aa424d",
    "style.css": "22153922a682a2a2e37a0f5d89caca9a87c160d6",
    "app.js": "3d1f4b8f4829479592ea107394262e00d1a5e51c"
  },
  "deploymentHistory": [
    {
      "commit": "a1b2c3d4e5f6g7h8",
      "manifestTxId": "xyz789...",
      "deployed": "2025-10-13T12:00:00.000Z"
    }
  ]
}
```

## Workflow Example

### Timeline
- **Monday**: Deploy v1.0 (all files)
- **Tuesday**: Change index.html
- **Wednesday**: Change style.css
- **Friday**: Deploy v1.1

### What Gets Deployed on Friday
```
🔍 Using hash-based change detection...
📝 File changed: index.html (modified)
📝 File changed: style.css (modified)
📁 Changed files: 2
```

### Result
- 2 files deployed (only changed ones)
- Updated manifest with new TXIDs for changed files
- Preserved existing TXIDs for unchanged files
- Total: 3 files (2 changed + manifest) instead of 100
- 97% cost savings

## Performance Benefits

### Hash-Based is Reliable
- Deterministic change detection
- Works with shallow git clones
- No git history dependencies
- Handles any deployment scenario

### Cost Optimization
- Only pay for files that actually changed
- Significant savings for small updates
- Faster deployments (less to upload)
- Less bandwidth usage

## Best Practices

### 1. Commit Tracker Files
- Always commit manifest.json and deployment-tracker.json
- GitHub workflow automatically commits these
- Ensures state is preserved between deployments

### 2. Use Git for Versioning
- Git commit hash used as ArNS undername
- Provides deployment versioning
- Easy rollback to any commit

### 3. Deploy Frequently
- Smaller deployments = fewer files to upload
- Easier to debug issues
- Better cost efficiency

### 4. Handle Edge Cases
- First deployment: No stored hashes, uploads all files
- No changes: Skips deployment entirely
- Deleted files: Removed from manifest automatically

## Integration Points

### With Current Deploy System
- Hash-based detection is always active
- No flags needed, works automatically
- Seamless integration with existing workflow

### With CI/CD
- Works with shallow clones (fetch-depth: 1)
- Fast checkouts in GitHub Actions
- Reliable across all environments

## Key Benefits

### Simplified Change Detection
- One code path (hash-based)
- Easy to understand and debug
- No git history complexity
- Works everywhere

### Git Independence
- No need for full git history
- Works with shallow clones
- No merge conflict issues
- Deterministic results

### Cost & Performance
- Only upload changed files
- Predictable behavior
- Fast change detection
- Scalable to any app size

## Implementation

### File Structure
```
apps/my-app/
├── index.html
├── style.css
├── app.js
├── manifest.json           # Arweave TXIDs (committed)
└── deployment-tracker.json # File hashes (committed)
```

### Change Detection Flow
1. Load deployment-tracker.json
2. Hash all files in app directory
3. Compare current hashes with stored hashes
4. Upload only files with different hashes
5. Update manifest with new Arweave TXIDs
6. Upload updated manifest
7. Update tracker with new hashes and commit info
8. Commit tracker and manifest back to repo

### GitHub Actions Integration
```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    fetch-depth: 1  # Shallow clone - we use hash-based detection

- name: Deploy to Arweave
  run: node deploy.js --app my-app
  # Automatically uses hash-based detection
  # Commits manifest and tracker files back to repo
```

This system provides true incremental deployment by using deterministic hash-based change detection, eliminating git history dependencies while maintaining all the benefits of incremental uploads.
