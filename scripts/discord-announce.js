#!/usr/bin/env node

// Script for GitHub Actions to announce deployments on Discord

import { sendDiscordNotification } from '../lib/discord.js';

const deploymentHash = process.argv[2];
const filePath = process.argv[3] || 'hello-world.txt';
const manifestTxId = process.argv[4] || null;

if (!deploymentHash) {
  console.error('❌ Deployment hash is required');
  console.log('Usage: node scripts/discord-announce.js <deployment_hash> [file_path] [manifest_tx_id]');
  process.exit(1);
}

const deploymentData = {
  success: true,
  undername: deploymentHash,
  commitHash: deploymentHash,
  filePath: filePath,
  txId: manifestTxId,
  manifestTxId: manifestTxId,
  fileSize: 0,
  duration: 0,
  ownerArnsName: process.env.OWNER_ARNS_NAME || 'testing-testing-123'
};

try {
  console.log('📢 Sending Discord notification...');
  const result = await sendDiscordNotification(deploymentData, true);
  
  if (result.success) {
    console.log('✅ Discord notification sent successfully');
    console.log(`📢 Notification sent with deployment URL: ${result.deploymentUrl}`);
  } else {
    console.log('❌ Discord notification failed:', result.error || result.reason);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Discord notification error:', error.message);
  process.exit(1);
}
