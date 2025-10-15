#!/usr/bin/env node

// Script to automatically merge PRs using GitHub API
// Handles draft PR conversion and merging with multiple fallback strategies

import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import git from 'isomorphic-git';
import fs from 'fs';
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

/**
 * Check if GitHub CLI is available
 */
function hasGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark PR as ready using GitHub CLI
 */
async function markReadyWithCLI(prNumber) {
  try {
    console.log('📝 Converting draft PR to ready (using GitHub CLI)...');
    execSync(`gh pr ready ${prNumber}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log('⚠️ GitHub CLI method failed, trying GraphQL API...');
    return false;
  }
}

/**
 * Mark PR as ready using GraphQL API
 */
async function markReadyWithGraphQL(token, prNodeId) {
  try {
    console.log('📝 Converting draft PR to ready (using GraphQL API)...');
    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });
    
    await graphqlWithAuth(
      `mutation($pullRequestId: ID!) {
        markPullRequestReadyForReview(input: {pullRequestId: $pullRequestId}) {
          pullRequest {
            id
            isDraft
          }
        }
      }`,
      {
        pullRequestId: prNodeId,
      }
    );
    return true;
  } catch (error) {
    console.error('⚠️ GraphQL API method failed:', error.message);
    return false;
  }
}

/**
 * Wait for PR to be mergeable with retries
 */
async function waitForMergeable(octokit, owner, repo, prNumber, maxRetries = 6) {
  for (let i = 0; i < maxRetries; i++) {
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(prNumber)
    });
    
    if (pr.mergeable && !pr.draft) {
      return pr;
    }
    
    if (i < maxRetries - 1) {
      const waitTime = i === 0 ? 12000 : 6000; // 12s first, then 6s
      console.log(`⏳ Waiting ${waitTime/1000}s for PR to be ready... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('PR did not become mergeable within expected time');
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
  
  // First, check PR status
  console.log('📋 Checking PR status...');
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: parseInt(prNumber)
  });
  
  // Handle draft PRs with multiple fallback methods
  if (pr.draft) {
    let success = false;
    
    // Try GitHub CLI first (fastest and most reliable)
    if (hasGitHubCLI()) {
      success = await markReadyWithCLI(prNumber);
    }
    
    // Fall back to GraphQL API
    if (!success) {
      success = await markReadyWithGraphQL(token, pr.node_id);
    }
    
    if (!success) {
      throw new Error('Failed to convert draft PR to ready for review');
    }
    
    console.log('✅ PR marked as ready for review');
    
    // Wait for PR to be mergeable with retries
    console.log('⏳ Waiting for PR to be mergeable...');
    await waitForMergeable(octokit, owner, repo, prNumber);
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
