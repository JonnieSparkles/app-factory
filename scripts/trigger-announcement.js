#!/usr/bin/env node

// Script to trigger GitHub Actions announcement workflow using REST API

import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const deploymentHash = process.argv[2];
const filePath = process.argv[3] || 'hello-world.txt';

if (!deploymentHash) {
  console.error('❌ Deployment hash is required');
  console.log('Usage: node scripts/trigger-announcement.js <deployment_hash> [file_path]');
  process.exit(1);
}

try {
  // Get repository info from git
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error('Could not determine repository owner/name');
  }
  
  const [, owner, repo] = match;
  
  // Get GitHub token from environment
  const token = process.env.REPO_TOKEN;
  if (!token) {
    throw new Error('REPO_TOKEN environment variable is required');
  }
  
  console.log(`🚀 Triggering announcement workflow for ${owner}/${repo}`);
  console.log(`📝 Deployment hash: ${deploymentHash}`);
  console.log(`📁 File: ${filePath}`);
  
  // Trigger workflow using GitHub REST API
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/announce.yml/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        deployment_hash: deploymentHash,
        file_path: filePath
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }
  
  console.log('✅ Announcement workflow triggered successfully!');
  console.log('🐦 Check GitHub Actions to see the announcement being posted');
  
} catch (error) {
  console.error('❌ Failed to trigger announcement workflow:', error.message);
  
  if (error.message.includes('REPO_TOKEN')) {
    console.log('\n💡 Add REPO_TOKEN to your environment variables');
    console.log('Get a token from: https://github.com/settings/tokens');
    console.log('Add it to your .env file or GitHub Secrets');
  }
  
  process.exit(1);
}
