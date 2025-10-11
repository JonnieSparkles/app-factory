#!/usr/bin/env node

// Script to trigger GitHub Actions workflows using REST API
// This avoids the need for GitHub CLI installation/authentication

import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const workflowName = process.argv[2];
const inputs = JSON.parse(process.argv[3] || '{}');

if (!workflowName) {
  console.error('❌ Workflow name is required');
  console.log('Usage: node scripts/trigger-workflow.js <workflow_name> [inputs_json]');
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
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  
  console.log(`🚀 Triggering workflow: ${workflowName}`);
  console.log(`📦 Repository: ${owner}/${repo}`);
  console.log(`📝 Inputs:`, inputs);
  
  // Trigger workflow using GitHub REST API
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowName}/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: inputs
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }
  
  console.log('✅ Workflow triggered successfully!');
  console.log('🔗 Check GitHub Actions to see the workflow running');
  
} catch (error) {
  console.error('❌ Failed to trigger workflow:', error.message);
  
  if (error.message.includes('GITHUB_TOKEN')) {
    console.log('\n💡 Add GITHUB_TOKEN to your environment variables');
    console.log('Get a token from: https://github.com/settings/tokens');
    console.log('Add it to your .env file or GitHub Secrets');
  }
  
  process.exit(1);
}
