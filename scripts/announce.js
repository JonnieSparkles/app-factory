#!/usr/bin/env node

// Script for GitHub Actions to announce deployments on Twitter

import { postTemplateAnnouncement, postDMAnnouncement } from '../lib/twitter.js';

const deploymentHash = process.argv[2];
const filePath = process.argv[3] || 'hello-world.txt';
const announceType = process.argv[4] || 'dm'; // Default to DM

if (!deploymentHash) {
  console.error('❌ Deployment hash is required');
  console.log('Usage: node scripts/announce.js <deployment_hash> [file_path] [announce_type]');
  console.log('Announce types: dm (default)');
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
  console.log('📩 Sending DM announcement...');
  const result = await postDMAnnouncement(deploymentData, 'jonniesparkles', true);
  
  if (result.success) {
    console.log('✅ DM announcement sent successfully');
    console.log(`📩 DM sent to @${result.recipient} with hash: ${deploymentHash}`);
  } else {
    console.log('❌ DM announcement failed:', result.error || result.reason);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ DM announcement error:', error.message);
  process.exit(1);
}
