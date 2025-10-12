# Multi-File App Deployment with Arweave Manifests

## Overview

The deploy flow now supports both single-file and multi-file apps. When an app has multiple files (HTML, CSS, JS, images, etc.), they are automatically deployed using an Arweave manifest that links all files together.

## How It Works

### 1. Detection

When deploying an app, the system automatically detects if it's a multi-file app by:
- Checking if the app's directory contains more than one file
- Excluding shared directories like `deploy/` (where multiple independent single-file apps may coexist)

### 2. Single-File Deployment (Traditional)

**Applies to:**
- Apps in the `deploy/` directory
- Apps with only one file in their directory

**Process:**
1. Upload the single file to Arweave
2. Get a transaction ID (txId)
3. Create an ArNS undername pointing to that txId
4. Done!

**Example:**
```bash
node deploy.js --app hello-world
# Deploys: deploy/hello-world.txt
# ArNS points to: single file txId
```

### 3. Multi-File Deployment (With Manifest)

**Applies to:**
- Apps in dedicated directories (like `apps/portfolio/`)
- Apps with multiple files (HTML, CSS, JS, etc.)

**Process:**
1. Scan the app directory recursively for all files
2. Upload each file individually to Arweave
3. Create a manifest JSON that maps file paths to transaction IDs
4. Upload the manifest to Arweave
5. Create an ArNS undername pointing to the **manifest txId**
6. Done!

**Example:**
```bash
node deploy.js --app portfolio
# Scans: apps/portfolio/
# Finds: index.html, style.css, app.js
# Uploads: 3 files individually
# Creates manifest mapping:
#   - index.html → txId1
#   - style.css → txId2
#   - app.js → txId3
# Uploads manifest → manifestTxId
# ArNS points to: manifestTxId
```

## Manifest Structure

The Arweave manifest follows the standard format:

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
    "style.css": {
      "id": "xyz789...css-id"
    },
    "app.js": {
      "id": "abc123...js-id"
    }
  }
}
```

### Manifest Tags

When uploading the manifest, the following tags are added:
- `Content-Type: application/x.arweave-manifest+json`
- `Type: manifest`
- `App-Name: <your-app-name>`
- `App-Version: 1.0.0`

## Key Features

### 1. Automatic Detection
No configuration needed - the system automatically detects multi-file apps based on directory structure.

### 2. Recursive File Discovery
All files in subdirectories are included:
```
apps/my-app/
  ├── index.html
  ├── css/
  │   ├── style.css
  │   └── theme.css
  ├── js/
  │   ├── app.js
  │   └── utils.js
  └── images/
      └── logo.png
```
All these files are uploaded and included in the manifest.

### 3. Content-Based Hashing
The commit hash is generated from the combined content of **all files**, ensuring:
- Same content = same hash = no duplicate deployment
- Any file change = new hash = new deployment

### 4. Proper Content Types
Each file is uploaded with the correct `Content-Type` header:
- `.html` → `text/html`
- `.css` → `text/css`
- `.js` → `application/javascript`
- `.png` → `image/png`
- etc.

### 5. Entry Point Configuration
The manifest's `index.path` is automatically set to your app's entry point:
```json
{
  "index": {
    "path": "index.html"  // or whatever your entryPoint is
  }
}
```

## ArNS Assignment

**Key Difference:**
- **Single-file apps:** ArNS points to the file's txId
- **Multi-file apps:** ArNS points to the **manifest's txId**

When users visit the ArNS name:
1. Arweave loads the manifest
2. Manifest directs to the index file
3. Browser loads index.html
4. Index.html references other files (CSS, JS)
5. Arweave resolves those paths via the manifest
6. All files load correctly!

## Testing

### Test Mode
Test multi-file deployment without uploading:

```bash
node deploy.js --app portfolio --test-mode
```

Output:
```
📦 Detected multi-file app - deploying with manifest...
📂 Scanning directory: apps/portfolio
📋 Found 3 files to deploy
   - app.js
   - index.html
   - style.css
📦 Total size: 7.08 KB
🔑 Generated commit hash: dca0b4e877b40ebf...
🔗 Manifest TX (mock): test-manifest-dca0b4e877b40ebf-1760285878967
🔗 ArNS: dca0b4e877b40ebf
```

## File Organization Best Practices

### For Single-File Apps
Place in the `deploy/` directory:
```
deploy/
  ├── hello-world.txt
  ├── hello-anthony.html
  └── index.html
```

### For Multi-File Apps
Create a dedicated directory in `apps/`:
```
apps/
  ├── portfolio/
  │   ├── index.html
  │   ├── style.css
  │   └── app.js
  ├── calculator/
  │   ├── index.html
  │   └── calc.js
  └── my-game/
      ├── index.html
      ├── game.js
      └── assets/
          └── sprite.png
```

## Implementation Details

### New Functions Added

**lib/arweave.js:**
- `createManifest(pathMap, indexPath)` - Creates manifest JSON structure
- `uploadManifest(pathMap, indexPath, appName, jwk)` - Uploads manifest to Arweave

**lib/utils.js:**
- `isDirectory(dirPath)` - Check if path is a directory
- `getAllFilesInDirectory(dirPath, relativeTo)` - Recursively get all files

**lib/app-factory.js:**
- `isMultiFileApp(appDir)` - Detect if app has multiple files
- `deployMultiFileApp(appId, app, appDir, options, startTime)` - Deploy multi-file app with manifest

### Deployment Flow

```
deployApp()
  ↓
  isMultiFileApp() ?
  ↓              ↓
 Yes            No
  ↓              ↓
deployMultiFileApp()  deployFile()
  ↓              ↓
1. Scan directory    Upload single file
2. Upload all files      ↓
3. Create manifest   Create ArNS record
4. Upload manifest       ↓
5. Create ArNS → manifest txId
  ↓
Done!
```

## Benefits

### 1. Native Support
No special configuration needed - just organize your files properly.

### 2. Efficient
Each file is uploaded once with its own txId. Files can be shared across deployments.

### 3. Standard Compliant
Uses the official Arweave manifest format (v0.2.0).

### 4. Backward Compatible
Single-file apps continue to work exactly as before.

### 5. Future-Ready
Supports any file type and directory structure.

## Examples

### Example 1: Portfolio Website
```
apps/portfolio/
  ├── index.html
  ├── style.css
  └── app.js
```

Deploy:
```bash
node deploy.js --app portfolio
```

Result:
- 3 files uploaded
- 1 manifest created
- ArNS points to manifest
- Website loads with all assets

### Example 2: Single Page App
```
deploy/
  └── hello-world.txt
```

Deploy:
```bash
node deploy.js --app hello-world
```

Result:
- 1 file uploaded
- No manifest needed
- ArNS points directly to file

## Troubleshooting

### App Not Detected as Multi-File
**Issue:** Multi-file app being deployed as single-file

**Solution:** Ensure:
- App is in a dedicated directory (not `deploy/`)
- Directory contains multiple files
- Entry point is correct in `apps.json`

### Manifest Not Working
**Issue:** Files not loading via manifest

**Solution:** Check:
- All file paths are relative to app directory
- Entry point matches manifest's `index.path`
- Content types are correct

## References

- [Arweave Manifest Documentation](https://docs.ar.io/build/upload/manifests)
- [Permaweb Deploy](https://github.com/permaweb/permaweb-deploy)
- [incremental-arweave-deployment.md](./incremental-arweave-deployment.md)
