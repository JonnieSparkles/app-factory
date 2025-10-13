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
    const config = loadConfig();
    
    const variables = {
      undername: deploymentData.undername || deploymentData.commitHash || 'unknown',
      ownerArnsName: config.ownerArnsName || 'unknown',
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
    const config = loadConfig();
    if (!config.discordWebhookUrl) {
      console.log('📢 Discord notifications not configured (DISCORD_WEBHOOK_URL not set)');
      return { success: false, reason: 'not_configured' };
    }

    // Skip test mode unless forceAnnounce is true
    if (deploymentData.testMode && !forceAnnounce) {
      console.log('📢 Skipping Discord notification for test mode');
      return { success: false, reason: 'test_mode' };
    }

    const webhookUrl = getDiscordWebhookUrl();
    const { content, deploymentUrl } = await formatDeploymentMessage(deploymentData);
    
    // Create Discord embed
    const embed = {
      title: "🚀 Deployment Complete",
      description: content,
      color: deploymentData.success ? 0x00ff00 : 0xff0000, // Green for success, red for failure
      fields: [
        {
          name: "📁 File",
          value: deploymentData.filePath || 'unknown',
          inline: true
        },
        {
          name: "🔑 Hash",
          value: deploymentData.undername || deploymentData.commitHash || 'unknown',
          inline: true
        },
        {
          name: "⏱️ Duration",
          value: deploymentData.duration ? `${deploymentData.duration}ms` : 'N/A',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Arweave Deployment System"
      }
    };

    // Add deployment link as a field if we have one
    if (deploymentUrl) {
      embed.fields.push({
        name: "🔗 Deployment",
        value: `[View Deployment](${deploymentUrl})`,
        inline: false
      });
    }

    // Add manifest link if we have a manifest transaction ID
    if (deploymentData.manifestTxId || deploymentData.txId) {
      const manifestTxId = deploymentData.manifestTxId || deploymentData.txId;
      embed.fields.push({
        name: "📋 Manifest",
        value: `[View Manifest](https://arweave.net/raw/${manifestTxId})`,
        inline: false
      });
    }

    const payload = {
      embeds: [embed]
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
