# Incremental Arweave Deployment

Deploys only changed files to Arweave using hash-based detection, saving costs and time.

## How It Works

1. **Hash Calculation** - Calculate SHA-256 hash for each file using `git hash-object`
2. **Change Detection** - Compare current hashes with stored hashes from deployment-tracker.json
3. **Selective Upload** - Upload only files where hash changed
4. **State Update** - Store updated hashes for next deployment

### Benefits
- **Deterministic**: Same file content = same hash = no re-upload
- **Git independent**: Works with shallow clones (fetch-depth: 1)
- **Reliable**: No merge conflicts or git history issues
- **Simple**: One code path, easy to debug

## File Structures

### Arweave Manifest

```json
{
  "manifest": "arweave/paths",
  "version": "0.2.0",
  "index": { "path": "index.html" },
  "paths": {
    "index.html": { "id": "bnYTf5wGyZRWUxNHa8R8eENBe6iHcWi4SudmMfBkzRE" },
    "css/style.css": { "id": "xyz789...css-id" },
    "js/app.js": { "id": "abc123...js-id" }
  }
}
```

### Deployment Tracker

```json
{
  "lastDeployCommit": "a1b2c3d4e5f6g7h8",
  "lastDeployed": "2025-10-13T12:00:00.000Z",
  "deploymentCount": 5,
  "fileHashes": {
    "index.html": "caec3826ccfb35618dc56489b7902f97a3aa424d",
    "style.css": "22153922a682a2a2e37a0f5d89caca9a87c160d6",
    "app.js": "3d1f4b8f4829479592ea107394262e00d1a5e51c"
  }
}
```

### Manual Overrides

External file references - merge into manifest during deployment:

```json
{
  "external-lib.js": "arweave-transaction-id-here",
  "shared-asset.png": "another-arweave-txid"
}
```

## Example Workflow

**Timeline:**
- Monday: Deploy v1.0 (all files)
- Tuesday: Change index.html
- Wednesday: Change style.css  
- Friday: Deploy v1.1

**Friday deployment:**
```
🔍 Using hash-based change detection...
📝 File changed: index.html (modified)
📝 File changed: style.css (modified)
📁 Changed files: 2
```

**Result:**
- 2 files deployed (only changed ones)
- Updated manifest with new TXIDs for changed files
- Preserved existing TXIDs for unchanged files
- 97% cost savings (2 files vs 100 files)

## Key Benefits

1. **Commit tracker files** - Always commit manifest.json and deployment-tracker.json
2. **Use git for versioning** - Git commit hash used as ArNS undername
3. **Deploy frequently** - Smaller deployments = fewer files to upload
4. **Handle edge cases** - First deployment uploads all files, no changes skips deployment

## Implementation

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

## System Evolution (October 2025)

The incremental deployment system was simplified by removing complex git diff logic and using pure hash-based change detection.

**Key Changes:**
- **Simplified GitTracker**: Removed ~140 lines of complex git diff logic
- **Enhanced ManifestManager**: Hash-based change detection as single source of truth
- **Streamlined Deployer**: Always uses hashing (removed `useHashing` parameter)
- **Optimized CI/CD**: Changed from `fetch-depth: 0` to `fetch-depth: 1`
- **Code Reduction**: ~200 lines of git diff logic removed

**Benefits:**
- **Reliability**: No git history dependencies, works with shallow clones
- **Simplicity**: One code path for change detection, easier to debug
- **Performance**: Fast hash comparison, minimal git operations
- **Maintenance**: Significantly easier to understand and maintain