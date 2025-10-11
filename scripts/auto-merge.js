#!/usr/bin/env node

// Script to automatically merge PRs using GitHub REST API
// This replaces the need for GitHub CLI in auto-merge workflows

import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prNumber = process.argv[2];
const mergeMethod = process.argv[3] || 'merge'; // merge, squash, or rebase

if (!prNumber) {
  console.error('❌ PR number is required');
  console.log('Usage: node scripts/auto-merge.js <pr_number> [merge_method]');
  console.log('Merge methods: merge, squash, rebase');
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
  const token = process.env.GITHUB_TOKEN || process.env.REPO_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN or REPO_TOKEN environment variable is required');
  }
  
  console.log(`🔄 Auto-merging PR #${prNumber} for ${owner}/${repo}`);
  console.log(`📝 Merge method: ${mergeMethod}`);
  
  // First, mark PR as ready for review if it's a draft
  console.log('📋 Checking PR status...');
  const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!prResponse.ok) {
    const error = await prResponse.text();
    throw new Error(`Failed to get PR info: ${prResponse.status} ${error}`);
  }
  
  const pr = await prResponse.json();
  
  if (pr.draft) {
    console.log('📝 Converting draft PR to ready for review...');
    const readyResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        draft: false
      })
    });
    
    if (!readyResponse.ok) {
      const error = await readyResponse.text();
      throw new Error(`Failed to mark PR as ready: ${readyResponse.status} ${error}`);
    }
    
    console.log('✅ PR marked as ready for review');
    
    // Wait longer for GitHub to process the status change
    console.log('⏳ Waiting for GitHub to process status change...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify the PR is no longer a draft
    const verifyResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (verifyResponse.ok) {
      const verifyPr = await verifyResponse.json();
      if (verifyPr.draft) {
        throw new Error('PR is still in draft status after conversion attempt');
      }
      console.log('✅ Verified PR is ready for review');
    }
  }
  
  // Now merge the PR
  console.log('🔀 Merging PR...');
  const mergeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      commit_title: `Merge PR #${prNumber}: ${pr.title}`,
      commit_message: `Auto-merged by AI agent\n\nCloses #${prNumber}`,
      merge_method: mergeMethod
    })
  });
  
  if (!mergeResponse.ok) {
    const error = await mergeResponse.text();
    throw new Error(`Failed to merge PR: ${mergeResponse.status} ${error}`);
  }
  
  const mergeResult = await mergeResponse.json();
  
  console.log('✅ PR merged successfully!');
  console.log(`🔗 Merge commit: ${mergeResult.sha}`);
  console.log(`📝 Message: ${mergeResult.commit.message}`);
  
} catch (error) {
  console.error('❌ Failed to auto-merge PR:', error.message);
  
  if (error.message.includes('GITHUB_TOKEN') || error.message.includes('REPO_TOKEN')) {
    console.log('\n💡 Add GITHUB_TOKEN or REPO_TOKEN to your environment variables');
    console.log('Get a token from: https://github.com/settings/tokens');
    console.log('Add it to your .env file or GitHub Secrets');
  } else if (error.message.includes('not mergeable')) {
    console.log('\n💡 PR is not mergeable. Check for:');
    console.log('- Merge conflicts');
    console.log('- Required status checks');
    console.log('- Required reviews');
  }
  
  process.exit(1);
}
