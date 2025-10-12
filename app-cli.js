#!/usr/bin/env node

// App Factory CLI
// Command-line interface for managing apps in the app factory

import { AppFactory } from './lib/app-factory.js';
import { fileExists } from './lib/utils.js';

const appFactory = new AppFactory();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Parse options
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--test-mode') {
      options.testMode = true;
    }
  }

  try {
    switch (command) {
      case 'list':
      case 'ls':
        await listApps();
        break;
      
      case 'create':
        await createApp(args[1], args[2] || 'html');
        break;
      
      case 'deploy':
        if (args[1] === 'all') {
          await deployAllApps(options);
        } else {
          await deployApp(args[1], options);
        }
        break;
      
      case 'info':
        await showAppInfo(args[1]);
        break;
      
      case 'enable':
        await toggleApp(args[1], true);
        break;
      
      case 'disable':
        await toggleApp(args[1], false);
        break;
      
      case 'remove':
        await removeApp(args[1]);
        break;
      
      case 'discover':
        await discoverApps();
        break;
      
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      
      default:
        console.log(`Unknown command: ${command}`);
        console.log('Use "app-cli.js help" for available commands.');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function listApps() {
  const apps = await appFactory.listApps();
  const appEntries = Object.entries(apps);
  
  if (appEntries.length === 0) {
    console.log('📱 No apps found. Use "app-cli.js create <name> <type>" to create one.');
    return;
  }

  console.log('📱 Available Apps:\n');
  
  for (const [appId, app] of appEntries) {
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

async function createApp(appId, templateType) {
  if (!appId) {
    throw new Error('App ID is required. Usage: app-cli.js create <app-id> [template-type]');
  }

  const validTemplates = ['html', 'react'];
  if (!validTemplates.includes(templateType)) {
    throw new Error(`Invalid template type: ${templateType}. Available: ${validTemplates.join(', ')}`);
  }

  console.log(`🏗️ Creating ${templateType} app '${appId}'...`);
  const result = await appFactory.createAppTemplate(appId, templateType);
  
  console.log(`\n🎉 App created successfully!`);
  console.log(`   📁 Files created: ${result.files.length}`);
  console.log(`   🚀 To deploy: app-cli.js deploy ${appId}`);
  
  if (templateType === 'react') {
    console.log(`   🔨 To develop: cd apps/${appId} && npm run dev`);
  }
}

async function deployApp(appId, options = {}) {
  if (!appId) {
    throw new Error('App ID is required. Usage: app-cli.js deploy <app-id>');
  }

  console.log(`🚀 Deploying app '${appId}'...`);
  const result = await appFactory.deployApp(appId, options);
  
  if (result.success) {
    if (result.testMode) {
      console.log(`🔍 Test mode completed for app '${appId}'`);
    } else {
      console.log(`✅ Deployment successful!`);
      console.log(`   🔗 ArNS: ${result.undername || result.commitHash}`);
      console.log(`   📊 TX ID: ${result.txId}`);
    }
  } else {
    throw new Error(`Deployment failed: ${result.error}`);
  }
}

async function deployAllApps(options = {}) {
  console.log(`🚀 Deploying all enabled apps...`);
  const results = await appFactory.deployAllApps(options);
  
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 Deployment Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${total - successful}`);
  
  for (const [appId, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${appId}`);
  }
}

async function showAppInfo(appId) {
  if (!appId) {
    throw new Error('App ID is required. Usage: app-cli.js info <app-id>');
  }

  const app = await appFactory.getApp(appId);
  
  console.log(`📱 App Information: ${app.name}\n`);
  console.log(`   ID: ${appId}`);
  console.log(`   Description: ${app.description}`);
  console.log(`   Type: ${app.type}`);
  console.log(`   Entry Point: ${app.entryPoint}`);
  console.log(`   Output Dir: ${app.outputDir}`);
  console.log(`   Enabled: ${app.enabled ? 'Yes' : 'No'}`);
  console.log(`   Deployments: ${app.deploymentCount || 0}`);
  console.log(`   Last Deployed: ${app.lastDeployed ? new Date(app.lastDeployed).toLocaleString() : 'Never'}`);
  
  if (app.buildCommand) {
    console.log(`   Build Command: ${app.buildCommand}`);
  }
}

async function toggleApp(appId, enabled) {
  if (!appId) {
    throw new Error('App ID is required. Usage: app-cli.js enable/disable <app-id>');
  }

  await appFactory.updateApp(appId, { enabled });
  const action = enabled ? 'enabled' : 'disabled';
  console.log(`✅ App '${appId}' ${action}`);
}

async function removeApp(appId) {
  if (!appId) {
    throw new Error('App ID is required. Usage: app-cli.js remove <app-id>');
  }

  const { createInterface } = await import('readline');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question(`Are you sure you want to remove app '${appId}'? (y/N): `, resolve);
  });
  
  rl.close();

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    await appFactory.removeApp(appId);
    console.log(`✅ App '${appId}' removed`);
  } else {
    console.log('❌ App removal cancelled');
  }
}

async function discoverApps() {
  console.log('🔍 Discovering apps...');
  const discoveredApps = await appFactory.discoverApps();
  
  if (Object.keys(discoveredApps).length === 0) {
    console.log('📱 No new apps discovered');
    return;
  }

  console.log(`📱 Discovered ${Object.keys(discoveredApps).length} new apps:`);
  
  for (const [appId, app] of Object.entries(discoveredApps)) {
    console.log(`   ✅ ${app.name} (${appId}) - ${app.entryPoint}`);
  }

  // Add discovered apps to config
  await appFactory.loadConfig();
  for (const [appId, app] of Object.entries(discoveredApps)) {
    appFactory.config.apps[appId] = app;
  }
  await appFactory.saveConfig();
  
  console.log('\n✅ Discovered apps added to configuration');
}

function showHelp() {
  console.log(`
📱 App Factory CLI - Manage your deployable apps

Commands:
  list, ls                    List all apps
  create <id> [type]          Create a new app (types: html, react)
  deploy <id>                 Deploy a specific app
  deploy all                  Deploy all enabled apps
  info <id>                   Show detailed app information
  enable <id>                 Enable an app for deployment
  disable <id>                Disable an app from deployment
  remove <id>                 Remove an app (with confirmation)
  discover                    Auto-discover apps in deploy/ and apps/ folders
  help                        Show this help message

Examples:
  app-cli.js create my-app html
  app-cli.js create my-react-app react
  app-cli.js deploy my-app
  app-cli.js deploy all
  app-cli.js list
  app-cli.js info my-app
  app-cli.js discover

For more information, see the README.md file.
`);
}

// Run CLI if this file is executed directly
if (process.argv[1].endsWith('app-cli.js')) {
  main();
}