#!/usr/bin/env node

// Script to trigger GitHub Actions announcement workflow

import { execSync } from 'child_process';
import fs from 'fs/promises';

const deploymentHash = process.argv[2];
const filePath = process.argv[3] || 'hello-world.txt';

if (!deploymentHash) {
  console.error('❌ Deployment hash is required');
  console.log('Usage: node scripts/trigger-announcement.js <deployment_hash> [file_path]');
  process.exit(1);
}

try {
  // Check if we're in a git repository
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  
  // Get the repository URL
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  
  // Extract owner and repo from URL
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error('Could not determine repository owner/name');
  }
  
  const [, owner, repo] = match;
  
  console.log(`🚀 Triggering announcement workflow for ${owner}/${repo}`);
  console.log(`📝 Deployment hash: ${deploymentHash}`);
  console.log(`📁 File: ${filePath}`);
  
  // Trigger the workflow using GitHub CLI
  const command = `gh workflow run agent-announce.yml -f deployment_hash="${deploymentHash}" -f file_path="${filePath}"`;
  
  console.log(`🔧 Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Announcement workflow triggered successfully!');
  console.log('🐦 Check GitHub Actions to see the announcement being posted');
  
} catch (error) {
  console.error('❌ Failed to trigger announcement workflow:', error.message);
  
  if (error.message.includes('gh: command not found')) {
    console.log('\n💡 GitHub CLI is not installed or not in PATH');
    console.log('Install it from: https://cli.github.com/');
  } else if (error.message.includes('not authenticated')) {
    console.log('\n💡 GitHub CLI is not authenticated');
    console.log('Run: gh auth login');
  }
  
  process.exit(1);
}
