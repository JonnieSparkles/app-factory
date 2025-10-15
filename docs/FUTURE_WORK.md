# Future Work

This document outlines planned enhancements, known limitations with current workarounds, and potential improvements to the App-Factory deployment system.

## Non-Git File Deployment

**Current Limitation:** System only deploys git-tracked files.

**Workaround 1:** Use `manifest-override.json` to reference existing TXIDs
```json
{
  "data.csv": "abc123...",
  "images/logo.png": "def456..."
}
```

**Workaround 2:** Upload files separately, then reference TXIDs in manifest

**Planned Enhancement:** `deploy-untracked/` directory support
- Add a `deploy-untracked/` directory that gets included in deployments alongside git-tracked files
- Maintains existing TXID override capability for advanced use cases
- Backward compatible with current workflow

## Performance Optimizations

**Planned Enhancements:**
- Parallel file uploads for faster deployment times
- Compression optimization for text-based files
- Incremental manifest updates for large applications
- Caching layer for frequently accessed deployment metadata

## Integration Opportunities

**External Tool Integration:**
- permaweb-deploy CLI integration (see [Integration Analysis](./PERMAWEB_DEPLOY_INTEGRATION_ANALYSIS.md))
- ArDrive CLI compatibility layer
- Web3.storage integration for hybrid storage strategies

**Development Workflow Enhancements:**
- VS Code extension for local development
- Pre-commit hooks for deployment validation
- Integration with popular CI/CD platforms beyond GitHub Actions

## Monitoring & Analytics

**Planned Features:**
- Deployment cost tracking and optimization suggestions
- Performance metrics dashboard
- Real-time deployment status monitoring
- Historical deployment analytics

## Security Enhancements

**Future Improvements:**
- Multi-signature deployment approval workflows
- Enhanced wallet rotation automation
- Deployment audit trails
- Content verification and integrity checking

## Developer Experience

**Planned Enhancements:**
- Interactive deployment wizard for new users
- Template system for common application types
- Hot-reload development mode for local testing
- Enhanced error messages and debugging tools

---

*This document will be updated as new limitations are discovered and enhancements are planned.*
