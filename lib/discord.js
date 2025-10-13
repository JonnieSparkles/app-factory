// Discord webhook notification system for deployment updates

import { loadConfig } from './utils.js';
import { getTemplateForDeployment, renderTemplate } from './templates.js';

// ---------- Discord webhook client ----------
function getDiscordWebhookUrl() {
  const config = loadConfig();
  
  if (!config.discordWebhookUrl) {
    throw new Error('Discord webhook URL not configured');
  }

  return config.discordWebhookUrl;
}

// ---------- Format deployment message for Discord ----------
async function formatDeploymentMessage(deploymentData) {
  try {
    const template = await getTemplateForDeployment(deploymentData);
    
    // Try to load config, but don't fail if environment variables are missing
    let config = null;
    try {
      config = loadConfig();
    } catch (error) {
      console.log('⚠️ Config not available, using deployment data directly');
    }
    
    const variables = {
      undername: deploymentData.undername || deploymentData.commitHash || 'unknown',
      ownerArnsName: config?.ownerArnsName || deploymentData.ownerArnsName || 'unknown',
      filePath: deploymentData.filePath || 'unknown',
      duration: deploymentData.duration ? `${(deploymentData.duration / 1000).toFixed(1)}s` : 'N/A',
      manifestTxId: deploymentData.manifestTxId || deploymentData.txId || 'unknown'
    };
    
    const message = renderTemplate(template, variables);
    
    // Create clickable link from the message
    const linkMatch = message.match(/https:\/\/[^\s]+/);
    const deploymentUrl = linkMatch ? linkMatch[0] : `https://${variables.undername}.${variables.ownerArnsName}.arweave.net`;
    
    return {
      content: `@jonniesparkles ${message}`,
      deploymentUrl: deploymentUrl
    };
  } catch (error) {
    console.warn('🐦 Template formatting failed, using default message:', error.message);
    
    const status = deploymentData.success ? '✅' : '❌';
    const action = deploymentData.success ? 'completed' : 'failed';
    const file = deploymentData.filePath || 'unknown file';
    const undername = deploymentData.undername || deploymentData.commitHash || 'unknown';
    const config = loadConfig();
    const ownerArnsName = config.ownerArnsName || 'unknown';
    
    const deploymentUrl = `https://${undername}.${ownerArnsName}.arweave.net`;
    
    return {
      content: `@jonniesparkles ${status} Deployment ${action}!\n\n📁 File: ${file}\n🔗 ${deploymentUrl}`,
      deploymentUrl: deploymentUrl
    };
  }
}

// ---------- Send Discord notification ----------
export async function sendDiscordNotification(deploymentData, forceAnnounce = false) {
  try {
    // Check if Discord is configured
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('📢 Discord notifications not configured (DISCORD_WEBHOOK_URL not set)');
      return { success: false, reason: 'not_configured' };
    }

    // Skip test mode unless forceAnnounce is true
    if (deploymentData.testMode && !forceAnnounce) {
      console.log('📢 Skipping Discord notification for test mode');
      return { success: false, reason: 'test_mode' };
    }

    const { content } = await formatDeploymentMessage(deploymentData);
    
    // Use the template content directly - it already has all the formatting we need
    const payload = {
      content: content
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    console.log('📢 Discord notification sent successfully');
    return { success: true, deploymentUrl: deploymentUrl };
    
  } catch (error) {
    console.error('❌ Failed to send Discord notification:', error.message);
    return { success: false, error: error.message };
  }
}

// ---------- Test Discord connection ----------
export async function testDiscordConnection() {
  try {
    const webhookUrl = getDiscordWebhookUrl();
    
    const payload = {
      content: "🧪 Testing Discord webhook connection...",
      embeds: [{
        title: "Connection Test",
        description: "If you see this message, Discord webhook is working!",
        color: 0x0099ff,
        timestamp: new Date().toISOString()
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} ${error}`);
    }

    console.log('📢 Discord webhook test successful!');
    return { success: true };
  } catch (error) {
    console.error('❌ Discord webhook test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ---------- Utility functions ----------
export function isDiscordConfigured() {
  try {
    const config = loadConfig();
    return !!config.discordWebhookUrl;
  } catch {
    return false;
  }
}
