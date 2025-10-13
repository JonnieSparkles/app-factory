#!/usr/bin/env node

// Remote Agent Deployment System
// Main script for deploying files to Arweave with ArNS integration

import dotenv from 'dotenv';
import { 
  generateCommitHash, 
  generateShortHash, 
  readFile, 
  writeFile, 
  fileExists,
  guessContentType,
  loadConfig,
  logDeploymentResult,
  handleError,
  validateFileContent,
  validateFilePath,
  formatBytes,
  formatDuration
} from './lib/utils.js';
import { readJSONLogs, getLogStats } from './lib/logging.js';
import { uploadToArweave, getTurboClient, loadWallet } from './lib/arweave.js';
import { 
  checkUndernameAvailability, 
  createUndernameRecord, 
  getUndernameRecord 
} from './lib/arns.js';
import { sendDiscordNotification, testDiscordConnection, isDiscordConfigured } from './lib/discord.js';
import { ANT, ArweaveSigner } from '@ar.io/sdk';
import { AppFactory } from './lib/app-factory.js';

// Load environment variables
dotenv.config();

// ---------- Main deployment function ----------
export async function deployFile(options = {}) {
  const startTime = Date.now();
  
  try {
    // Parse and validate options
    const {
      filePath = 'hello-world.txt',
      content = null,
      commitMessage = null,
      dryRun = false,
      testMode = false,
      announceDiscord = false,
      triggerAnnouncement = false,
      triggerGithubDeploy = false
    } = options;

    console.log(`🚀 Starting deployment for: ${filePath}`);
    
    // Validate inputs
    validateFilePath(filePath);
    
    // Read current file content or use provided content
    let fileContent;
    if (content !== null) {
      validateFileContent(content);
      fileContent = content;
      console.log(`📝 Using provided content (${formatBytes(content.length)})`);
    } else {
      if (!(await fileExists(filePath))) {
        throw new Error(`File not found: ${filePath}`);
      }
      fileContent = await readFile(filePath);
      console.log(`📖 Read existing file: ${filePath} (${formatBytes(fileContent.length)})`);
    }

    // Generate commit hash
    const commitHash = generateCommitHash(fileContent, commitMessage);
    const shortHash = generateShortHash(commitHash);
    console.log(`🔑 Generated commit hash: ${shortHash}...`);

    if (dryRun || testMode) {
      const mode = testMode ? 'test mode' : 'dry run';
      console.log(`🔍 ${mode} - would deploy to undername: ${shortHash}`);
      
      // In test mode, simulate a successful deployment
      if (testMode) {
        // Load minimal config for test mode
        const config = {
          arnsTtl: 60,
          appName: 'RemoteAgentDeploy'
        };
        const mockTxId = `test-${shortHash}-${Date.now()}`;
        const result = {
          success: true,
          testMode: true,
          filePath,
          commitHash: shortHash,
          txId: mockTxId,
          undername: shortHash,
          ttl: config.arnsTtl,
          fileSize: fileContent.length,
          duration: Date.now() - startTime,
          arnsRecordId: `test-record-${shortHash}`
        };
        
        await logDeploymentResult(result);
        
        
        
        // Send Discord notification if requested
        if (announceDiscord && result.success) {
          try {
            const discordResult = await sendDiscordNotification(result, true); // Force announce even in test mode
            if (discordResult.success) {
              console.log('📢 Discord notification sent');
            } else {
              console.log(`📢 Discord notification failed: ${discordResult.error || discordResult.reason}`);
            }
          } catch (error) {
            console.error('📢 Discord notification error:', error.message);
          }
        }
        
        // Trigger GitHub Actions announcement if requested
        if (triggerAnnouncement && result.success) {
          try {
            console.log('🚀 Triggering GitHub Actions announcement workflow...');
            const { execSync } = await import('child_process');
            execSync(`node scripts/trigger-announcement.js "${result.undername || result.commitHash}" "${result.filePath}"`, { stdio: 'inherit' });
            console.log('✅ Announcement workflow triggered successfully!');
          } catch (error) {
            console.error('🐦 Failed to trigger announcement workflow:', error.message);
          }
        }

        // Handle trigger GitHub deployment option
        if (triggerGithubDeploy) {
          try {
            console.log('🚀 Triggering GitHub Actions deployment workflow...');
            const { execSync } = await import('child_process');
            execSync(`node scripts/trigger-deploy.js "${filePath}" "${commitMessage || 'Deployed via AI agent'}"`, { stdio: 'inherit' });
            console.log('✅ Deployment workflow triggered successfully!');
            return { success: true, message: 'GitHub Actions deployment workflow triggered' };
          } catch (error) {
            console.error('❌ Failed to trigger deployment workflow:', error.message);
            return { success: false, error: error.message };
          }
        }
        
        return result;
      }
      
      return {
        success: true,
        dryRun: true,
        commitHash: shortHash,
        undername: shortHash,
        fileSize: fileContent.length,
        duration: Date.now() - startTime
      };
    }

    // Load configuration for real deployment
    const config = loadConfig();

    // Check if this commit already exists in ArNS
    const wallet = await loadWallet();
    const signer = new ArweaveSigner(wallet);
    const ant = ANT.init({ 
      signer: signer, 
      processId: config.antProcessId 
    });
    const existingRecord = await getUndernameRecord(ant, shortHash);
    
    if (existingRecord) {
      console.log(`⚠️ Commit already deployed: ${existingRecord.id}`);
      return {
        success: true,
        alreadyDeployed: true,
        commitHash: shortHash,
        txId: existingRecord.id,
        undername: shortHash,
        ttl: config.arnsTtl,
        fileSize: fileContent.length,
        duration: Date.now() - startTime
      };
    }

    // Upload to Arweave
    console.log(`☁️ Uploading to Arweave...`);
    const contentType = guessContentType(filePath);
    const txId = await uploadToArweave(
      Buffer.from(fileContent, 'utf-8'),
      contentType,
      config.appName
    );
    
    console.log(`✅ Uploaded to Arweave: ${txId}`);

    // Create ArNS record
    console.log(`📝 Creating ArNS record: ${shortHash} → ${txId}`);
    const arnsResult = await createUndernameRecord(
      ant,
      shortHash,
      txId,
      config.arnsTtl
    );

    if (!arnsResult.success) {
      throw new Error(`ArNS record creation failed: ${arnsResult.message}`);
    }

    // Update local file if content was provided
    if (content !== null) {
      await writeFile(filePath, content);
    }

    const result = {
      success: true,
      filePath,
      commitHash: shortHash,
      txId,
      undername: shortHash,
      ttl: config.arnsTtl,
      fileSize: fileContent.length,
      duration: Date.now() - startTime,
      arnsRecordId: arnsResult.recordId
    };

    await logDeploymentResult(result);
    
    
    
    // Send Discord notification if requested
    if (announceDiscord && result.success) {
      try {
        const discordResult = await sendDiscordNotification(result, true); // Force announce even in test mode
        if (discordResult.success) {
          console.log('📢 Discord notification sent');
        } else {
          console.log(`📢 Discord notification failed: ${discordResult.error || discordResult.reason}`);
        }
      } catch (error) {
        console.error('📢 Discord notification error:', error.message);
      }
    }
    
    // Trigger GitHub Actions announcement if requested
    if (triggerAnnouncement && result.success) {
      try {
        console.log('🚀 Triggering GitHub Actions announcement workflow...');
        const { execSync } = await import('child_process');
        execSync(`node scripts/trigger-announcement.js "${result.undername || result.commitHash}" "${result.filePath}"`, { stdio: 'inherit' });
        console.log('✅ Announcement workflow triggered successfully!');
      } catch (error) {
        console.error('🐦 Failed to trigger announcement workflow:', error.message);
      }
    }
    
    return result;

  } catch (error) {
    const result = handleError(error, 'Deployment ');
    result.duration = Date.now() - startTime;
    result.filePath = options.filePath || 'hello-world.txt';
    
    // Log failed deployment
    await logDeploymentResult(result);
    return result;
  }
}

// ---------- Log viewing functions ----------
async function showLogs() {
  try {
    const logs = await readJSONLogs();
    
    if (logs.length === 0) {
      console.log('📋 No deployment logs found.');
      return;
    }
    
    console.log(`📋 Deployment Logs (${logs.length} entries):\n`);
    
    logs.forEach((log, index) => {
      const status = log.success ? '✅' : '❌';
      const timestamp = new Date(log.timestamp).toLocaleString();
      
      console.log(`${index + 1}. ${status} ${timestamp}`);
      console.log(`   File: ${log.filePath || 'N/A'}`);
      console.log(`   Commit: ${log.commitHash || 'N/A'}`);
      console.log(`   TX ID: ${log.txId || 'N/A'}`);
      console.log(`   Status: ${log.success ? 'SUCCESS' : 'FAILED'}`);
      if (log.error) {
        console.log(`   Error: ${log.error}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error(`❌ Failed to show logs:`, error.message);
  }
}

async function showStats() {
  try {
    const stats = await getLogStats();
    
    if (!stats) {
      console.log('📊 No deployment statistics available.');
      return;
    }
    
    console.log('📊 Deployment Statistics:\n');
    console.log(`Total Deployments: ${stats.totalDeployments}`);
    console.log(`Successful: ${stats.successfulDeployments}`);
    console.log(`Failed: ${stats.failedDeployments}`);
    console.log(`Dry Runs: ${stats.dryRuns}`);
    console.log(`Already Deployed: ${stats.alreadyDeployed}`);
    console.log(`Total File Size: ${formatBytes(stats.totalFileSize)}`);
    console.log(`Average Duration: ${formatDuration(stats.averageDuration)}`);
    
    if (stats.lastDeployment) {
      console.log(`Last Deployment: ${new Date(stats.lastDeployment).toLocaleString()}`);
    }
    
    if (stats.totalDeployments > 0) {
      const successRate = ((stats.successfulDeployments / stats.totalDeployments) * 100).toFixed(1);
      console.log(`Success Rate: ${successRate}%`);
    }
  } catch (error) {
    console.error(`❌ Failed to show stats:`, error.message);
  }
}


async function testDiscord() {
  try {
    console.log('📢 Testing Discord webhook connection...');
    
    if (!isDiscordConfigured()) {
      console.log('❌ Discord not configured. Set DISCORD_WEBHOOK_URL');
      return;
    }
    
    const result = await testDiscordConnection();
    if (result.success) {
      console.log(`✅ Discord webhook test successful!`);
    } else {
      console.log(`❌ Discord webhook test failed: ${result.error}`);
    }
  } catch (error) {
    console.error(`❌ Discord test failed:`, error.message);
  }
}

// ---------- App Factory Integration ----------
async function deployApp(appId, options = {}) {
  const appFactory = new AppFactory();
  
  // Use incremental deployment by default (can be disabled with --no-incremental)
  if (options.incremental !== false) {
    return await appFactory.deployAppIncremental(appId, options);
  } else {
    return await appFactory.deployApp(appId, options);
  }
}

async function listApps() {
  const appFactory = new AppFactory();
  const apps = await appFactory.listApps();
  
  console.log('📱 Available Apps:\n');
  
  for (const [appId, app] of Object.entries(apps)) {
    const status = app.enabled ? '✅' : '❌';
    const lastDeployed = app.lastDeployed ? new Date(app.lastDeployed).toLocaleDateString() : 'Never';
    const deployCount = app.deploymentCount || 0;
    
    console.log(`${status} ${app.name} (${appId})`);
    console.log(`   📝 ${app.description}`);
    console.log(`   📁 ${app.entryPoint}`);
    console.log(`   🚀 Deployments: ${deployCount} | Last: ${lastDeployed}`);
    console.log('');
  }
}

// ---------- CLI interface ----------
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {};

    // Parse options first
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--test-mode') {
        options.testMode = true;
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--announce-discord') {
        options.announceDiscord = true;
      } else if (arg === '--trigger-announcement') {
        options.triggerAnnouncement = true;
      } else if (arg === '--trigger-github-deploy') {
        options.triggerGithubDeploy = true;
      } else if (arg === '--no-incremental') {
        options.incremental = false;
      } else if (arg === '--use-hashing') {
        options.useHashing = true;
      }
    }

    // Parse commands
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--app':
        case '-a':
          // Deploy a specific app
          const appId = args[++i];
          if (!appId) {
            console.error('❌ App ID required. Usage: --app <app-id>');
            process.exit(1);
          }
          const result = await deployApp(appId, options);
          if (!result.success) {
            console.error(`❌ App deployment failed: ${result.error}`);
            process.exit(1);
          }
          if (result.testMode) {
            console.log(`🔍 Test mode completed for app '${appId}'`);
          } else if (result.alreadyDeployed) {
            console.log(`✅ App '${appId}' already deployed with this content`);
          } else {
            console.log(`✅ App '${appId}' deployed successfully!`);
          }
          return;
        case '--list-apps':
          await listApps();
          process.exit(0);
          break;
        case '--file':
        case '-f':
          options.filePath = args[++i];
          break;
        case '--content':
        case '-c':
          options.content = args[++i];
          break;
        case '--message':
        case '-m':
          options.commitMessage = args[++i];
          break;
        case '--dry-run':
          // Already parsed above
          break;
        case '--test-mode':
          // Already parsed above
          break;
        case '--logs':
        case '-l':
          await showLogs();
          process.exit(0);
          break;
        case '--stats':
        case '-s':
          await showStats();
          process.exit(0);
          break;
        case '--test-discord':
          await testDiscord();
          process.exit(0);
          break;
        case '--announce-discord':
          // Already parsed above
          break;
        case '--trigger-announcement':
          // Already parsed above
          break;
        case '--trigger-github-deploy':
          // Already parsed above
          break;
          case '--help':
        case '-h':
          console.log(`
Usage: node deploy.js [options]

App Factory Options:
  -a, --app <id>           Deploy a specific app by ID (uses incremental deployment)
  --list-apps              List all available apps
  --no-incremental         Disable incremental deployment (use full deployment)
  --use-hashing            Use file hashing instead of git for change detection

Deployment Options:
  -m, --message <text>     Commit message for hash generation
  --test-mode             Simulate deployment with mock data (no real upload)

Utility Options:
  -l, --logs              Show deployment logs
  -s, --stats             Show deployment statistics
  --test-discord          Test Discord webhook connection
  -h, --help              Show this help message

Examples:
  # Deploy a specific app (incremental deployment)
  node deploy.js --app hello-world
  node deploy.js --app celebration
  
  # Deploy with full deployment (no incremental)
  node deploy.js --app hello-world --no-incremental
  
  # Deploy using file hashing (more reliable)
  node deploy.js --app hello-world --use-hashing
  
  # List available apps
  node deploy.js --list-apps
  
  # Test and utility commands
  node deploy.js --test-mode --app hello-world
  node deploy.js --logs
  node deploy.js --stats
  node deploy.js --test-discord

For app management, use: node app-cli.js help
          `);
          process.exit(0);
          break;
        default:
          if (!arg.startsWith('-')) {
            // Treat as content if no flag
            options.content = arg;
          }
          break;
      }
    }

    // Deploy the file (legacy behavior)
    const result = await deployFile(options);
    
    if (!result.success) {
      console.error(`❌ Deployment failed: ${result.error}`);
      process.exit(1);
    }

    if (result.dryRun) {
      console.log(`🔍 Dry run completed successfully`);
    } else if (result.alreadyDeployed) {
      console.log(`✅ File already deployed with this content`);
    } else {
      console.log(`✅ Deployment completed successfully`);
    }

  } catch (error) {
    console.error(`❌ Fatal error:`, error.message);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  main();
}
