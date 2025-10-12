#!/usr/bin/env node

// Script for GitHub Actions to announce deployments on Twitter

import { postTemplateAnnouncement, postDMAnnouncement } from '../lib/twitter.js';

const deploymentHash = process.argv[2];
const filePath = process.argv[3] || 'hello-world.txt';
const announceType = process.argv[4] || 'public'; // 'public' or 'dm'

if (!deploymentHash) {
  console.error('❌ Deployment hash is required');
  console.log('Usage: node scripts/announce.js <deployment_hash> [file_path] [announce_type]');
  console.log('Announce types: public, dm');
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
  let result;
  
  if (announceType === 'dm') {
    console.log('📩 Sending DM announcement...');
    result = await postDMAnnouncement(deploymentData, 'jonniesparkles', true);
  } else {
    console.log('🐦 Sending public announcement...');
    result = await postTemplateAnnouncement(deploymentData, true);
  }
  
  if (result.success) {
    console.log('✅ Twitter announcement posted successfully');
    if (announceType === 'dm') {
      console.log(`📩 DM sent to @${result.recipient} with hash: ${deploymentHash}`);
    } else {
      console.log(`🐦 Tweet posted with hash: ${deploymentHash}`);
    }
  } else {
    console.log('❌ Twitter announcement failed:', result.error || result.reason);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Twitter announcement error:', error.message);
  process.exit(1);
}
