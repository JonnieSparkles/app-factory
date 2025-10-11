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
    console.log(`🔍 PR details: ${pr.title} (draft: ${pr.draft})`);
    
    // Try using GitHub CLI approach first
    try {
      console.log('🔧 Attempting conversion via GitHub CLI...');
      const { execSync } = await import('child_process');
      execSync(`gh pr ready ${prNumber}`, { 
        stdio: 'inherit',
        env: { ...process.env, GITHUB_TOKEN: token }
      });
      console.log('✅ PR marked as ready for review via GitHub CLI');
    } catch (cliError) {
      console.log('⚠️ GitHub CLI failed, trying REST API...');
      console.log(`CLI Error: ${cliError.message}`);
      
      // Fallback to REST API
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
        console.error(`❌ REST API conversion failed: ${readyResponse.status} ${error}`);
        throw new Error(`Failed to mark PR as ready: ${readyResponse.status} ${error}`);
      }
      
      const conversionResult = await readyResponse.json();
      console.log('✅ PR marked as ready for review via REST API');
      console.log(`🔍 Conversion result: draft=${conversionResult.draft}`);
    }
    
    // Wait for GitHub to process the status change
    console.log('⏳ Waiting for GitHub to process status change...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify the PR is no longer a draft with retries
    let attempts = 0;
    let maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔍 Verification attempt ${attempts}/${maxAttempts}...`);
      
      const verifyResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (verifyResponse.ok) {
        const verifyPr = await verifyResponse.json();
        console.log(`🔍 PR status: draft=${verifyPr.draft}, state=${verifyPr.state}`);
        
        if (!verifyPr.draft) {
          console.log('✅ Verified PR is ready for review');
          break;
        } else if (attempts < maxAttempts) {
          console.log('⏳ Still in draft, waiting longer...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw new Error('PR is still in draft status after multiple conversion attempts');
        }
      } else {
        console.error(`❌ Verification failed: ${verifyResponse.status}`);
        if (attempts === maxAttempts) {
          throw new Error('Failed to verify PR status after conversion');
        }
      }
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
