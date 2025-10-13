#!/usr/bin/env node

// App Factory Management System
// Handles discovery, configuration, and deployment of multiple apps

import { readFile, writeFile, fileExists, listDir, getAllFilesInDirectory, isDirectory, guessContentType, generateCommitHash, generateShortHash, formatBytes } from './utils.js';
import { deployFile } from '../deploy.js';
import { uploadToArweave, uploadManifest, loadWallet } from './arweave.js';
import { createUndernameRecord, getUndernameRecord } from './arns.js';
import { ANT, ArweaveSigner } from '@ar.io/sdk';
import { loadConfig, handleError } from './utils.js';
import { logDeploymentResult } from './utils.js';
import { IncrementalDeployer } from './incremental-deploy.js';
import path from 'path';

export class AppFactory {
  constructor(configPath = 'apps.json') {
    this.configPath = configPath;
    this.config = null;
  }

  async loadConfig() {
    try {
      if (await fileExists(this.configPath)) {
        const configData = await readFile(this.configPath);
        this.config = JSON.parse(configData);
      } else {
        // Create default config
        this.config = {
          version: "1.0.0",
          description: "App Factory Configuration - Manage multiple deployable apps",
          apps: {},
          settings: {
            defaultAppType: "static",
            autoDiscoverApps: true,
            deploymentStrategy: "individual",
            backupBeforeDeploy: true,
            notifyOnDeploy: true
          }
        };
        await this.saveConfig();
      }
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load app factory config: ${error.message}`);
    }
  }

  async saveConfig() {
    try {
      await writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save app factory config: ${error.message}`);
    }
  }

  async discoverApps() {
    await this.loadConfig(); // Ensure config is loaded
    const discoveredApps = {};
    
    // Discover apps in apps folder (if it exists)
    try {
      if (await fileExists('apps')) {
        const appDirs = await listDir('apps');
        for (const dir of appDirs) {
          const appId = dir;
          const appName = this.formatAppName(appId);
          
          if (!this.config.apps[appId]) {
            // Look for common entry points
            const possibleEntryPoints = [
              `apps/${dir}/index.html`,
              `apps/${dir}/main.html`,
              `apps/${dir}/app.html`,
              `apps/${dir}/index.js`,
              `apps/${dir}/main.js`,
              `apps/${dir}/app.js`
            ];
            
            let entryPoint = null;
            for (const entry of possibleEntryPoints) {
              if (await fileExists(entry)) {
                entryPoint = entry;
                break;
              }
            }

            if (entryPoint) {
              discoveredApps[appId] = {
                name: appName,
                description: `Auto-discovered app in ${dir}`,
                type: this.guessAppType(entryPoint),
                entryPoint: entryPoint,
                buildCommand: await this.findBuildCommand(`apps/${dir}`),
                outputDir: `apps/${dir}/dist`,
                enabled: true,
                lastDeployed: null,
                deploymentCount: 0
              };
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not discover apps in apps folder: ${error.message}`);
    }

    return discoveredApps;
  }

  async findBuildCommand(appDir) {
    try {
      // Check for package.json
      if (await fileExists(`${appDir}/package.json`)) {
        const packageData = JSON.parse(await readFile(`${appDir}/package.json`));
        if (packageData.scripts && packageData.scripts.build) {
          return `cd ${appDir} && npm run build`;
        }
      }
      
      // Check for other build files
      const buildFiles = ['build.sh', 'build.bat', 'Makefile', 'webpack.config.js', 'vite.config.js'];
      for (const buildFile of buildFiles) {
        if (await fileExists(`${appDir}/${buildFile}`)) {
          return `cd ${appDir} && ./${buildFile}`;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return null;
  }

  formatAppName(appId) {
    return appId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  guessAppType(filePath) {
    if (filePath.endsWith('.html')) return 'static';
    if (filePath.endsWith('.js')) return 'javascript';
    if (filePath.endsWith('.txt')) return 'text';
    if (filePath.endsWith('.json')) return 'data';
    return 'static';
  }

  async addApp(appId, appConfig) {
    await this.loadConfig();
    
    if (this.config.apps[appId]) {
      throw new Error(`App '${appId}' already exists`);
    }

    this.config.apps[appId] = {
      name: appConfig.name || this.formatAppName(appId),
      description: appConfig.description || `App: ${appId}`,
      type: appConfig.type || this.config.settings.defaultAppType,
      entryPoint: appConfig.entryPoint,
      buildCommand: appConfig.buildCommand || null,
      outputDir: appConfig.outputDir || 'deploy',
      enabled: appConfig.enabled !== false,
      lastDeployed: null,
      deploymentCount: 0
    };

    await this.saveConfig();
    return this.config.apps[appId];
  }

  async updateApp(appId, updates) {
    await this.loadConfig();
    
    if (!this.config.apps[appId]) {
      throw new Error(`App '${appId}' not found`);
    }

    this.config.apps[appId] = {
      ...this.config.apps[appId],
      ...updates
    };

    await this.saveConfig();
    return this.config.apps[appId];
  }

  async removeApp(appId) {
    await this.loadConfig();
    
    if (!this.config.apps[appId]) {
      throw new Error(`App '${appId}' not found`);
    }

    delete this.config.apps[appId];
    await this.saveConfig();
  }

  async listApps() {
    await this.loadConfig();
    return this.config.apps;
  }

  async getApp(appId) {
    await this.loadConfig();
    
    if (!this.config.apps[appId]) {
      throw new Error(`App '${appId}' not found`);
    }

    return this.config.apps[appId];
  }

  async deployApp(appId, options = {}) {
    const startTime = Date.now();
    const app = await this.getApp(appId);
    
    if (!app.enabled) {
      throw new Error(`App '${appId}' is disabled`);
    }

    // Validate app entry point exists
    if (!(await fileExists(app.entryPoint))) {
      throw new Error(`App entry point not found: ${app.entryPoint}`);
    }

    // Run build command if specified (skip in test mode)
    if (app.buildCommand && !options.testMode) {
      console.log(`🔨 Building app '${appId}'...`);
      const { execSync } = await import('child_process');
      try {
        execSync(app.buildCommand, { stdio: 'inherit' });
        console.log(`✅ Build completed for '${appId}'`);
      } catch (error) {
        throw new Error(`Build failed for '${appId}': ${error.message}`);
      }
    }

    // Determine if this is a multi-file app
    const appDir = path.dirname(app.entryPoint);
    const isMultiFile = await this.isMultiFileApp(appDir);

    if (isMultiFile) {
      console.log(`📦 Detected multi-file app - deploying with manifest...`);
      return await this.deployMultiFileApp(appId, app, appDir, options, startTime);
    } else {
      // Single file deployment
      console.log(`🚀 Deploying single file app '${appId}'...`);
      const deployOptions = {
        filePath: app.entryPoint,
        ...options
      };

      const result = await deployFile(deployOptions);

      if (result.success) {
        // Update app deployment info (skip in test mode)
        if (!options.testMode) {
          await this.updateApp(appId, {
            lastDeployed: new Date().toISOString(),
            deploymentCount: (app.deploymentCount || 0) + 1,
            lastCommitHash: result.commitHash,
            lastTxId: result.txId
          });
        }

        console.log(`✅ App '${appId}' deployed successfully!`);
        console.log(`   📁 Entry Point: ${app.entryPoint}`);
        console.log(`   🔗 ArNS: ${result.undername || result.commitHash}`);
        console.log(`   📊 Deployments: ${(app.deploymentCount || 0) + 1}`);
        
        if (result.txId) {
          console.log(`   🔗 TX ID: ${result.txId}`);
        }
      } else {
        throw new Error(`Deployment failed for '${appId}': ${result.error || 'Unknown error'}`);
      }

      return result;
    }
  }

  async isMultiFileApp(appDir) {
    // Check if the app directory contains more than one file
    try {
      if (!(await isDirectory(appDir))) {
        return false;
      }

      const files = await getAllFilesInDirectory(appDir);
      return files.length > 1;
    } catch (error) {
      console.warn(`Warning: Could not check if multi-file app: ${error.message}`);
      return false;
    }
  }

  async deployMultiFileApp(appId, app, appDir, options, startTime) {
    try {
      console.log(`📂 Scanning directory: ${appDir}`);
      
      // Get all files in the app directory
      const files = await getAllFilesInDirectory(appDir);
      console.log(`📋 Found ${files.length} files to deploy`);
      
      // Calculate total size
      const { statSync } = await import('fs');
      const totalSize = files.reduce((sum, file) => {
        const stats = statSync(file.absolutePath);
        return sum + stats.size;
      }, 0);
      console.log(`📦 Total size: ${formatBytes(totalSize)}`);

      // Generate a commit hash based on all file contents
      let combinedContent = '';
      for (const file of files) {
        const content = await readFile(file.absolutePath);
        combinedContent += `${file.relativePath}:${content}\n`;
      }
      const commitHash = generateCommitHash(combinedContent);
      const shortHash = generateShortHash(commitHash);
      console.log(`🔑 Generated commit hash: ${shortHash}...`);

      // In test mode, simulate the deployment
      if (options.testMode) {
        const mockManifestTxId = `test-manifest-${shortHash}-${Date.now()}`;
        const result = {
          success: true,
          testMode: true,
          appId,
          filePath: app.entryPoint,
          commitHash: shortHash,
          txId: mockManifestTxId,
          manifestTxId: mockManifestTxId,
          undername: shortHash,
          ttl: 60,
          fileCount: files.length,
          totalSize,
          duration: Date.now() - startTime,
          arnsRecordId: `test-record-${shortHash}`,
          files: files.map(f => f.relativePath)
        };

        console.log(`✅ Multi-file app '${appId}' test completed!`);
        console.log(`   📁 Files: ${files.length}`);
        files.forEach(f => console.log(`      - ${f.relativePath}`));
        console.log(`   📦 Size: ${formatBytes(totalSize)}`);
        console.log(`   🔗 Manifest TX (mock): ${mockManifestTxId}`);
        console.log(`   🔗 ArNS: ${shortHash}`);

        return result;
      }

      // Load config and check if already deployed
      const config = loadConfig();
      const wallet = await loadWallet();
      const signer = new ArweaveSigner(wallet);
      const ant = ANT.init({ 
        signer: signer, 
        processId: config.antProcessId 
      });
      
      const existingRecord = await getUndernameRecord(ant, shortHash);
      if (existingRecord) {
        console.log(`⚠️ App already deployed with this content: ${existingRecord.id}`);
        return {
          success: true,
          alreadyDeployed: true,
          appId,
          commitHash: shortHash,
          txId: existingRecord.id,
          manifestTxId: existingRecord.id,
          undername: shortHash,
          ttl: config.arnsTtl,
          fileCount: files.length,
          totalSize,
          duration: Date.now() - startTime
        };
      }

      // Upload all files
      console.log(`☁️ Uploading ${files.length} files to Arweave...`);
      const pathMap = {};
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`  [${i + 1}/${files.length}] Uploading ${file.relativePath}...`);
        
        const fileContent = await readFile(file.absolutePath);
        const contentType = guessContentType(file.absolutePath);
        
        const txId = await uploadToArweave(
          Buffer.from(fileContent, 'utf-8'),
          contentType,
          config.appName,
          wallet
        );
        
        pathMap[file.relativePath] = txId;
        console.log(`     ✅ ${txId}`);
      }

      // Determine the index file
      const entryPointRelative = path.relative(appDir, app.entryPoint).replace(/\\/g, '/');
      const indexPath = entryPointRelative || 'index.html';
      
      console.log(`📝 Creating manifest with index: ${indexPath}`);
      
      // Upload the manifest
      const manifestTxId = await uploadManifest(pathMap, indexPath, config.appName, wallet);
      
      // Create ArNS record pointing to the manifest
      const arnsResult = await createUndernameRecord(
        ant,
        shortHash,
        manifestTxId,
        config.arnsTtl
      );

      if (!arnsResult.success) {
        throw new Error(`ArNS record creation failed: ${arnsResult.message}`);
      }

      const result = {
        success: true,
        appId,
        filePath: app.entryPoint,
        commitHash: shortHash,
        txId: manifestTxId,
        manifestTxId: manifestTxId,
        undername: shortHash,
        ttl: config.arnsTtl,
        fileCount: files.length,
        fileSize: totalSize, // Fix: Use totalSize for fileSize field
        totalSize,
        duration: Date.now() - startTime,
        arnsRecordId: arnsResult.recordId,
        files: pathMap
      };

      // Log the deployment
      await logDeploymentResult(result);

      // Update app deployment info
      await this.updateApp(appId, {
        lastDeployed: new Date().toISOString(),
        deploymentCount: (app.deploymentCount || 0) + 1,
        lastCommitHash: shortHash,
        lastTxId: manifestTxId
      });

      console.log(`✅ Multi-file app '${appId}' deployed successfully!`);
      console.log(`   📁 Files: ${files.length}`);
      console.log(`   📦 Size: ${formatBytes(totalSize)}`);
      console.log(`   🔗 Manifest TX: ${manifestTxId}`);
      console.log(`   🔗 ArNS: ${shortHash}`);
      console.log(`   📊 Deployments: ${(app.deploymentCount || 0) + 1}`);

      return result;
    } catch (error) {
      const result = handleError(error, `Multi-file app deployment for '${appId}': `);
      result.duration = Date.now() - startTime;
      result.appId = appId;
      result.filePath = app.entryPoint;
      
      await logDeploymentResult(result);
      throw error;
    }
  }

  async deployAllApps(options = {}) {
    const apps = await this.listApps();
    const enabledApps = Object.entries(apps).filter(([_, app]) => app.enabled);
    
    console.log(`🚀 Deploying ${enabledApps.length} enabled apps...`);
    
    const results = {};
    let successCount = 0;
    let failureCount = 0;
    
    for (const [appId, app] of enabledApps) {
      try {
        console.log(`\n--- Deploying ${app.name} (${appId}) ---`);
        results[appId] = await this.deployApp(appId, options);
        if (results[appId].success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to deploy ${appId}: ${error.message}`);
        results[appId] = { success: false, error: error.message };
        failureCount++;
      }
    }

    // Summary
    console.log(`\n📊 Deployment Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📱 Total: ${enabledApps.length}`);

    return results;
  }

  async getAppStatus(appId) {
    const app = await this.getApp(appId);
    const status = {
      id: appId,
      name: app.name,
      enabled: app.enabled,
      lastDeployed: app.lastDeployed,
      deploymentCount: app.deploymentCount || 0,
      lastCommitHash: app.lastCommitHash,
      lastTxId: app.lastTxId,
      entryPoint: app.entryPoint,
      entryPointExists: await fileExists(app.entryPoint)
    };
    return status;
  }

  async getSystemStatus() {
    const apps = await this.listApps();
    const status = {
      totalApps: Object.keys(apps).length,
      enabledApps: Object.values(apps).filter(app => app.enabled).length,
      disabledApps: Object.values(apps).filter(app => !app.enabled).length,
      totalDeployments: Object.values(apps).reduce((sum, app) => sum + (app.deploymentCount || 0), 0),
      lastDeployment: null,
      apps: {}
    };

    // Get detailed status for each app
    for (const [appId, app] of Object.entries(apps)) {
      status.apps[appId] = await this.getAppStatus(appId);
      
      // Track most recent deployment
      if (app.lastDeployed && (!status.lastDeployment || app.lastDeployed > status.lastDeployment)) {
        status.lastDeployment = app.lastDeployed;
      }
    }

    return status;
  }

  async createAppTemplate(appId, templateType = 'html') {
    const templates = {
      html: {
        name: 'HTML App',
        description: 'A simple HTML application',
        entryPoint: `apps/${appId}/index.html`,
        buildCommand: null,
        outputDir: `apps/${appId}`,
        files: {
          [`apps/${appId}/index.html`]: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.formatAppName(appId)}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
        }
        .btn {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: white;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to ${this.formatAppName(appId)}!</h1>
        <p>This is your new app created with the App Factory.</p>
        <button class="btn" onclick="alert('Hello from ${appId}!')">Click Me!</button>
    </div>
</body>
</html>`
        }
      },
      react: {
        name: 'React App',
        description: 'A React application with Vite',
        entryPoint: `apps/${appId}/dist/index.html`,
        buildCommand: `cd apps/${appId} && npm install && npm run build`,
        outputDir: `apps/${appId}/dist`,
        files: {
          [`apps/${appId}/package.json`]: `{
  "name": "${appId}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5"
  }
}`,
          [`apps/${appId}/vite.config.js`]: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})`,
          [`apps/${appId}/index.html`]: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.formatAppName(appId)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
          [`apps/${appId}/src/main.jsx`]: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
          [`apps/${appId}/src/App.jsx`]: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>Welcome to ${this.formatAppName(appId)}!</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          This is your new React app created with the App Factory.
        </p>
      </div>
    </div>
  )
}

export default App`,
          [`apps/${appId}/src/App.css`]: `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.App {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
  padding: 2rem;
}

h1 {
  font-size: 3rem;
  margin-bottom: 2rem;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.25s;
}

button:hover {
  background-color: white;
  color: #667eea;
  transform: translateY(-2px);
}`,
          [`apps/${appId}/src/index.css`]: `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}`
        }
      }
    };

    const template = templates[templateType];
    if (!template) {
      throw new Error(`Unknown template type: ${templateType}. Available: ${Object.keys(templates).join(', ')}`);
    }

    // Create the app directory
    const { mkdirSync } = await import('fs');
    try {
      mkdirSync(`apps/${appId}`, { recursive: true });
      if (templateType === 'react') {
        mkdirSync(`apps/${appId}/src`, { recursive: true });
      }
    } catch (error) {
      // Directory might already exist
    }

    // Create template files
    for (const [filePath, content] of Object.entries(template.files)) {
      await writeFile(filePath, content);
    }

    // Add app to configuration
    await this.addApp(appId, {
      name: template.name,
      description: template.description,
      type: templateType,
      entryPoint: template.entryPoint,
      buildCommand: template.buildCommand,
      outputDir: template.outputDir
    });

    console.log(`✅ Created ${templateType} app '${appId}'`);
    console.log(`   📁 Location: apps/${appId}/`);
    console.log(`   🚀 Entry Point: ${template.entryPoint}`);
    if (template.buildCommand) {
      console.log(`   🔨 Build Command: ${template.buildCommand}`);
    }

    return {
      appId,
      template: templateType,
      files: Object.keys(template.files)
    };
  }

  // ---------- Incremental Deployment Methods ----------

  async deployAppIncremental(appId, options = {}) {
    const startTime = Date.now();
    const app = await this.getApp(appId);
    
    if (!app.enabled) {
      throw new Error(`App '${appId}' is disabled`);
    }

    // Validate app entry point exists
    if (!(await fileExists(app.entryPoint))) {
      throw new Error(`App entry point not found: ${app.entryPoint}`);
    }

    // Run build command if specified (skip in test mode)
    if (app.buildCommand && !options.testMode) {
      console.log(`🔨 Building app '${appId}'...`);
      const { execSync } = await import('child_process');
      try {
        execSync(app.buildCommand, { stdio: 'inherit' });
        console.log(`✅ Build completed for '${appId}'`);
      } catch (error) {
        throw new Error(`Build failed for '${appId}': ${error.message}`);
      }
    }

    try {
      // Create incremental deployer
      const appDir = path.dirname(app.entryPoint);
      const deployer = new IncrementalDeployer(appId, appDir);
      
      // Validate app before deployment
      const validation = await deployer.validateApp();
      if (!validation.valid) {
        throw new Error(`App validation failed: ${validation.error}`);
      }

      // Perform incremental deployment
      const result = await deployer.deploy(options.testMode, options.useHashing);
      
      if (result.success && !result.skipped) {
        // Update app configuration with deployment info
        await this.updateAppDeploymentInfo(appId, result);
        
        // Log deployment result
        const logResult = {
          success: true,
          appId: appId,
          filePath: app.entryPoint,
          commitHash: result.commitHash,
          txId: result.manifestTxId,
          manifestTxId: result.manifestTxId,
          undername: result.undername,
          fileSize: result.stats.totalSize,
          duration: Date.now() - startTime,
          testMode: options.testMode,
          deploymentType: 'incremental',
          changedFiles: result.changedFiles.length,
          version: result.version
        };
        
        await logDeploymentResult(logResult);
        
        console.log(`✅ Incremental deployment completed for '${appId}'`);
        console.log(`   📁 Files changed: ${result.changedFiles.length}`);
        console.log(`   📦 Size: ${formatBytes(result.stats.totalSize)}`);
        console.log(`   🔗 Manifest TX: ${result.manifestTxId}`);
        console.log(`   🔗 ArNS: ${result.undername}`);
        console.log(`   📊 Deployments: ${(app.deploymentCount || 0) + 1}`);
      } else if (result.skipped) {
        console.log(`⏭️ Deployment skipped for '${appId}': ${result.reason}`);
      }

      return result;
    } catch (error) {
      const result = handleError(error, `Incremental deployment for '${appId}': `);
      result.duration = Date.now() - startTime;
      result.appId = appId;
      result.filePath = app.entryPoint;
      result.deploymentType = 'incremental';
      
      await logDeploymentResult(result);
      throw error;
    }
  }

  async deployAllAppsIncremental(options = {}) {
    const apps = await this.listApps();
    const enabledApps = Object.entries(apps).filter(([_, app]) => app.enabled);
    
    console.log(`🚀 Starting incremental deployment for ${enabledApps.length} enabled apps...`);
    
    const results = {};
    let successCount = 0;
    let skippedCount = 0;
    let failureCount = 0;
    
    for (const [appId, app] of enabledApps) {
      try {
        console.log(`\n--- Incremental Deploy: ${app.name} (${appId}) ---`);
        results[appId] = await this.deployAppIncremental(appId, options);
        
        if (results[appId].success) {
          if (results[appId].skipped) {
            skippedCount++;
          } else {
            successCount++;
          }
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to deploy ${appId}: ${error.message}`);
        results[appId] = { success: false, error: error.message };
        failureCount++;
      }
    }

    // Summary
    console.log(`\n📊 Incremental Deployment Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️ Skipped: ${skippedCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📊 Total: ${enabledApps.length}`);

    return {
      results,
      summary: {
        total: enabledApps.length,
        successful: successCount,
        skipped: skippedCount,
        failed: failureCount
      }
    };
  }

  async getAppDeploymentInfo(appId) {
    const app = await this.getApp(appId);
    const appDir = path.dirname(app.entryPoint);
    const deployer = new IncrementalDeployer(appId, appDir);
    
    return await deployer.getDeploymentInfo();
  }

  async getAppDeploymentHistory(appId) {
    const app = await this.getApp(appId);
    const appDir = path.dirname(app.entryPoint);
    const deployer = new IncrementalDeployer(appId, appDir);
    
    return await deployer.getDeploymentHistory();
  }

  async updateAppDeploymentInfo(appId, deploymentResult) {
    await this.loadConfig();
    
    if (this.config.apps[appId]) {
      this.config.apps[appId] = {
        ...this.config.apps[appId],
        lastDeployed: new Date().toISOString(),
        deploymentCount: (this.config.apps[appId].deploymentCount || 0) + 1,
        lastCommitHash: deploymentResult.commitHash,
        lastTxId: deploymentResult.manifestTxId,
        lastVersion: deploymentResult.version
      };
      
      await this.saveConfig();
    }
  }
}