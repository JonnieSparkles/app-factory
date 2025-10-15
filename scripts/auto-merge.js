#!/usr/bin/env node

// Script to automatically merge PRs using GitHub REST API
// This replaces the need for GitHub CLI in auto-merge workflows

import { Octokit } from '@octokit/rest';
import git from 'isomorphic-git';
import fs from 'fs';
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
  // Get repository info from git or environment
  let owner, repo;
  
  // Try to get from GITHUB_REPOSITORY environment variable (GitHub Actions)
  if (process.env.GITHUB_REPOSITORY) {
    [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  } else {
    // Fall back to reading from git config
    try {
      const remoteUrl = await git.getConfig({ 
        fs, 
        dir: process.cwd(), 
        path: 'remote.origin.url' 
      });
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error('Could not determine repository owner/name');
  }
      [, owner, repo] = match;
    } catch (gitError) {
      throw new Error('Could not determine repository owner/name from git config or environment');
    }
  }
  
  // Get GitHub token from environment
  const token = process.env.GITHUB_TOKEN || process.env.REPO_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN or REPO_TOKEN environment variable is required');
  }
  
  // Initialize Octokit
  const octokit = new Octokit({ auth: token });
  
  console.log(`🔄 Auto-merging PR #${prNumber} for ${owner}/${repo}`);
  console.log(`📝 Merge method: ${mergeMethod}`);
  
  // First, mark PR as ready for review if it's a draft
  console.log('📋 Checking PR status...');
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: parseInt(prNumber)
  });
  
  if (pr.draft) {
    console.log('📝 Converting draft PR to ready for review...');
    console.log(`🔍 PR details: ${pr.title} (draft: ${pr.draft})`);
    
    try {
      console.log('🔧 Converting draft to ready via Octokit...');
      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: parseInt(prNumber),
        draft: false
      });
      console.log('✅ PR marked as ready for review');
    } catch (conversionError) {
      console.error(`❌ Failed to convert draft PR: ${conversionError.message}`);
      throw new Error(`Unable to convert draft PR to ready-for-review: ${conversionError.message}`);
    }
    
    // Wait for GitHub to process the status change
    console.log('⏳ Waiting for GitHub to process status change...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify the PR is no longer a draft
    const { data: verifyPr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(prNumber)
    });
    
        console.log(`🔍 PR status: draft=${verifyPr.draft}, state=${verifyPr.state}`);
        
        if (!verifyPr.draft) {
          console.log('✅ Verified PR is ready for review');
        } else {
      console.log('⚠️ PR still in draft, but proceeding with merge attempt');
    }
  }
  
  // Now merge the PR
  console.log('🔀 Merging PR...');
  const { data: mergeResult } = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: parseInt(prNumber),
    commit_title: `Merge PR #${prNumber}: ${pr.title}`,
    commit_message: `Auto-merged by AI agent\n\nCloses #${prNumber}`,
    merge_method: mergeMethod
  });
  
  console.log('✅ PR merged successfully!');
  console.log(`🔗 Merge commit: ${mergeResult.sha}`);
  console.log(`📝 Message: Auto-merged PR #${prNumber}`);
  
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
