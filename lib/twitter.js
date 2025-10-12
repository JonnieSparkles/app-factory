// Twitter notification system for deployment updates

import { TwitterApi } from 'twitter-api-v2';
import { loadConfig } from './utils.js';
import { getTemplateForDeployment, renderTemplate } from './templates.js';

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

// ---------- Format template-based tweet ----------
async function formatTemplateTweet(deploymentData) {
  try {
    const template = await getTemplateForDeployment(deploymentData);
    const config = loadConfig();
    
    const variables = {
      undername: deploymentData.undername || deploymentData.commitHash || 'unknown',
      ownerArnsName: config.ownerArnsName || 'unknown'
    };
    
    return renderTemplate(template, variables);
  } catch (error) {
    console.warn('🐦 Template formatting failed, falling back to default:', error.message);
    return formatDeploymentTweet(deploymentData);
  }
}

// ---------- Send DM function ----------
export async function sendDM(toUsername, message) {
  try {
    const client = getTwitterClient();
    
    // Get user ID from username
    const user = await client.v2.userByUsername(toUsername);
    if (!user.data) {
      throw new Error(`User @${toUsername} not found`);
    }
    
    // Send DM
    await client.v1.sendDm({
      recipient_id: user.data.id,
      text: message
    });
    
    console.log(`📩 DM sent to @${toUsername}`);
    return { success: true, recipient: toUsername };
    
  } catch (error) {
    console.error(`❌ Failed to send DM to @${toUsername}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ---------- Template-based announcement function ----------
export async function postTemplateAnnouncement(deploymentData, forceAnnounce = false) {
  try {
    // Check if Twitter is configured
    const config = loadConfig();
    if (!config.twitterAppKey) {
      console.log('🐦 Twitter notifications not configured (TWITTER_APP_KEY not set)');
      return { success: false, reason: 'not_configured' };
    }

    // Skip test mode unless forceAnnounce is true
    if (deploymentData.testMode && !forceAnnounce) {
      console.log('🐦 Skipping template announcement for test mode');
      return { success: false, reason: 'test_mode' };
    }

    const client = getTwitterClient();
    const tweet = await formatTemplateTweet(deploymentData);
    
    // Ensure tweet is within character limit
    if (tweet.length > 280) {
      console.warn('🐦 Tweet too long, truncating...');
      const truncatedTweet = tweet.substring(0, 277) + '...';
      await client.v2.tweet(truncatedTweet);
    } else {
      await client.v2.tweet(tweet);
    }
    
    console.log('🐦 Posted template announcement to Twitter');
    return { success: true, tweet: tweet };
    
  } catch (error) {
    console.error('❌ Failed to post template announcement to Twitter:', error.message);
    return { success: false, error: error.message };
  }
}

// ---------- DM-based announcement function ----------
export async function postDMAnnouncement(deploymentData, toUsername = 'jonniesparkles', forceAnnounce = false) {
  try {
    // Check if Twitter is configured
    const config = loadConfig();
    if (!config.twitterAppKey) {
      console.log('🐦 Twitter notifications not configured (TWITTER_APP_KEY not set)');
      return { success: false, reason: 'not_configured' };
    }

    // Skip test mode unless forceAnnounce is true
    if (deploymentData.testMode && !forceAnnounce) {
      console.log('🐦 Skipping DM announcement for test mode');
      return { success: false, reason: 'test_mode' };
    }

    const message = await formatTemplateTweet(deploymentData);
    
    // Send DM
    const result = await sendDM(toUsername, message);
    
    if (result.success) {
      console.log('📩 Posted DM announcement to Twitter');
      return { success: true, message: message, recipient: toUsername };
    } else {
      return result;
    }
    
  } catch (error) {
    console.error('❌ Failed to post DM announcement to Twitter:', error.message);
    return { success: false, error: error.message };
  }
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
