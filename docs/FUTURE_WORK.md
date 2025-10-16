# Future Work

## Non-Git File Deployment

**Current Limitation:** System only deploys git-tracked files.

**Workaround 1:** Use `manifest-override.json` to reference existing TXIDs
```json
{
  "data.csv": "abc123...",
  "images/logo.png": "def456..."
}
```
This approach allows you to upload files separately (using any Arweave upload tool) and then reference their transaction IDs in your deployment manifest. The files will be included in your final deployment without being re-uploaded.

**Workaround 2:** Upload files separately, then reference TXIDs in manifest
For large files or sensitive data, you can upload them using external tools (ArDrive, Turbo, etc.) and then reference their TXIDs in the manifest-override.json file. This is useful for files you don't want tracked in git or files that are too large for efficient git management.

**Planned Enhancement:** `deploy-untracked/` directory support
- Add a `deploy-untracked/` directory that gets included in deployments alongside git-tracked files
- Files in this directory would be uploaded during deployment but not tracked in git
- Maintains existing TXID override capability for advanced use cases
- Backward compatible with current workflow
- Would simplify the workflow for users who need to include non-git files without the complexity of manual TXID management
- Would only work for local / manual deployments however as non-git files would not be available for GitHub actions

## Optional Git-Free Deployment Mode

**Current Limitation:** System requires git repository and git-tracked files for deployment.

**Proposed Enhancement:** Add optional git-free deployment mode
- Add `--allow-untracked` CLI flag to bypass git tracking requirements
- Implement filesystem-based file discovery as alternative to git tracking
- Use `.deployignore` file (similar to `.gitignore`) for security filtering
- Default deny-list for sensitive file patterns (`.env`, `*.key`, etc.)
- Warning system for untracked deployments
- Separate deployment modes: `--git-mode` (default) vs `--filesystem-mode`
- Maintains all existing functionality and security for current users
- Enables quick prototyping and reduces barrier to entry
- Preserves hash-based change detection benefits
- Would only work for local/manual deployments (GitHub Actions still requires git)