#!/usr/bin/env node

// Script to trigger GitHub Actions deployment workflow

import { execSync } from 'child_process';

const filePath = process.argv[2] || 'hello-world.txt';
const message = process.argv[3] || 'Deployed via AI agent';

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
  
  console.log(`🚀 Triggering deployment workflow for ${owner}/${repo}`);
  console.log(`📁 File: ${filePath}`);
  console.log(`📝 Message: ${message}`);
  
  // Trigger the workflow using GitHub CLI
  const command = `gh workflow run "🚀 Deploy to Arweave" -f file_path="${filePath}" -f message="${message}"`;
  
  console.log(`🔧 Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Deployment workflow triggered successfully!');
  console.log('🚀 Check GitHub Actions to see the deployment progress');
  
} catch (error) {
  console.error('❌ Failed to trigger deployment workflow:', error.message);
  
  if (error.message.includes('gh: command not found')) {
    console.log('\n💡 GitHub CLI is not installed or not in PATH');
    console.log('Install it from: https://cli.github.com/');
  } else if (error.message.includes('not authenticated')) {
    console.log('\n💡 GitHub CLI is not authenticated');
    console.log('Run: gh auth login');
  }
  
  process.exit(1);
}
