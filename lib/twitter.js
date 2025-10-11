// Twitter notification system for deployment updates

import { TwitterApi } from 'twitter-api-v2';
import { loadConfig } from './utils.js';

// ---------- Twitter client initialization ----------
function getTwitterClient() {
  const config = loadConfig();
  
  if (!config.twitterAppKey || !config.twitterAppSecret || 
      !config.twitterAccessToken || !config.twitterAccessSecret) {
    throw new Error('Twitter API credentials not configured');
  }

  return new TwitterApi({
    appKey: config.twitterAppKey,
    appSecret: config.twitterAppSecret,
    accessToken: config.twitterAccessToken,
    accessSecret: config.twitterAccessSecret,
  });
}

// ---------- Tweet formatting ----------
function formatDeploymentTweet(deploymentData) {
  const status = deploymentData.success ? '✅' : '❌';
  const action = deploymentData.success ? 'completed' : 'failed';
  const file = deploymentData.filePath || 'unknown file';
  const txId = deploymentData.txId ? deploymentData.txId.substring(0, 8) + '...' : 'N/A';
  const duration = deploymentData.duration ? `${deploymentData.duration}ms` : 'N/A';
  const size = deploymentData.fileSize ? `${deploymentData.fileSize} bytes` : 'N/A';
  
  let tweet = `${status} Deployment ${action}!\n\n`;
  tweet += `📁 File: ${file}\n`;
  tweet += `🔗 TX: ${txId}\n`;
  tweet += `⏱️ Duration: ${duration}\n`;
  tweet += `📊 Size: ${size}\n\n`;
  
  if (deploymentData.error) {
    tweet += `❌ Error: ${deploymentData.error}\n\n`;
  }
  
  tweet += `#Arweave #Deployment #AI`;
  
  return tweet;
}

// ---------- Main notification function ----------
export async function postDeploymentNotification(deploymentData) {
  try {
    // Check if Twitter is configured
    const config = loadConfig();
    if (!config.twitterAppKey) {
      console.log('🐦 Twitter notifications not configured (TWITTER_APP_KEY not set)');
      return { success: false, reason: 'not_configured' };
    }

    // Skip test mode and dry runs
    if (deploymentData.testMode || deploymentData.dryRun) {
      console.log('🐦 Skipping Twitter notification for test/dry run');
      return { success: false, reason: 'test_mode' };
    }

    // Skip already deployed (no new deployment)
    if (deploymentData.alreadyDeployed) {
      console.log('🐦 Skipping Twitter notification for already deployed content');
      return { success: false, reason: 'already_deployed' };
    }

    const client = getTwitterClient();
    const tweet = formatDeploymentTweet(deploymentData);
    
    // Ensure tweet is within character limit
    if (tweet.length > 280) {
      console.warn('🐦 Tweet too long, truncating...');
      const truncatedTweet = tweet.substring(0, 277) + '...';
      await client.v2.tweet(truncatedTweet);
    } else {
      await client.v2.tweet(tweet);
    }
    
    console.log('🐦 Posted deployment notification to Twitter');
    return { success: true, tweet: tweet };
    
  } catch (error) {
    console.error('❌ Failed to post to Twitter:', error.message);
    return { success: false, error: error.message };
  }
}

// ---------- Test function ----------
export async function testTwitterConnection() {
  try {
    const client = getTwitterClient();
    const user = await client.v2.me();
    console.log(`🐦 Twitter connection successful! Logged in as: @${user.data.username}`);
    return { success: true, username: user.data.username };
  } catch (error) {
    console.error('❌ Twitter connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ---------- Utility functions ----------
export function isTwitterConfigured() {
  try {
    const config = loadConfig();
    return !!(config.twitterAppKey && config.twitterAppSecret && 
              config.twitterAccessToken && config.twitterAccessSecret);
  } catch {
    return false;
  }
}
