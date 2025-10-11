#!/usr/bin/env node

// Script for GitHub Actions to announce deployments on Twitter

import { postTemplateAnnouncement } from '../lib/twitter.js';

const deploymentHash = process.argv[2];
const filePath = process.argv[3] || 'hello-world.txt';

if (!deploymentHash) {
  console.error('❌ Deployment hash is required');
  console.log('Usage: node scripts/announce.js <deployment_hash> [file_path]');
  process.exit(1);
}

const deploymentData = {
  success: true,
  undername: deploymentHash,
  commitHash: deploymentHash,
  filePath: filePath,
  txId: `github-action-${Date.now()}`,
  fileSize: 0,
  duration: 0
};

try {
  const result = await postTemplateAnnouncement(deploymentData, true);
  
  if (result.success) {
    console.log('✅ Twitter announcement posted successfully');
    console.log(`🐦 Tweet posted with hash: ${deploymentHash}`);
  } else {
    console.log('❌ Twitter announcement failed:', result.error || result.reason);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Twitter announcement error:', error.message);
  process.exit(1);
}
