#!/usr/bin/env node

// Script to trigger GitHub Actions deployment workflow using REST API

import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const filePath = process.argv[2] || 'hello-world.txt';
const message = process.argv[3] || 'Deployed via AI agent';

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
  
  console.log(`🚀 Triggering deployment workflow for ${owner}/${repo}`);
  console.log(`📁 File: ${filePath}`);
  console.log(`📝 Message: ${message}`);
  
  // Trigger workflow using GitHub REST API
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy.yml/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        file_path: filePath,
        message: message
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }
  
  console.log('✅ Deployment workflow triggered successfully!');
  console.log('🚀 Check GitHub Actions to see the deployment progress');
  
} catch (error) {
  console.error('❌ Failed to trigger deployment workflow:', error.message);
  
  if (error.message.includes('REPO_TOKEN')) {
    console.log('\n💡 Add REPO_TOKEN to your environment variables');
    console.log('Get a token from: https://github.com/settings/tokens');
    console.log('Add it to your .env file or GitHub Secrets');
  }
  
  process.exit(1);
}
