#!/usr/bin/env node

// App Factory Management System
// Handles discovery, configuration, and deployment of multiple apps

import { readFile, writeFile, fileExists, listDir } from './utils.js';
import { deployFile } from '../deploy.js';

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
    
    // Discover apps in the deploy folder
    try {
      const deployFiles = await listDir('deploy');
      for (const file of deployFiles) {
        if (file.endsWith('.html') || file.endsWith('.txt') || file.endsWith('.js')) {
          const appId = file.replace(/\.[^/.]+$/, ""); // Remove extension
          const appName = this.formatAppName(appId);
          
          if (!this.config.apps[appId]) {
            discoveredApps[appId] = {
              name: appName,
              description: `Auto-discovered ${file} app`,
              type: this.guessAppType(file),
              entryPoint: `deploy/${file}`,
              buildCommand: null,
              outputDir: "deploy",
              enabled: true,
              lastDeployed: null,
              deploymentCount: 0
            };
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not discover apps in deploy folder: ${error.message}`);
    }

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
    const app = await this.getApp(appId);
    
    if (!app.enabled) {
      throw new Error(`App '${appId}' is disabled`);
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

    // Deploy the app
    console.log(`🚀 Deploying app '${appId}'...`);
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
          deploymentCount: (app.deploymentCount || 0) + 1
        });
      }

      console.log(`✅ App '${appId}' deployed successfully!`);
      console.log(`   📁 Entry Point: ${app.entryPoint}`);
      console.log(`   🔗 ArNS: ${result.undername || result.commitHash}`);
      console.log(`   📊 Deployments: ${(app.deploymentCount || 0) + 1}`);
    }

    return result;
  }

  async deployAllApps(options = {}) {
    const apps = await this.listApps();
    const enabledApps = Object.entries(apps).filter(([_, app]) => app.enabled);
    
    console.log(`🚀 Deploying ${enabledApps.length} enabled apps...`);
    
    const results = {};
    for (const [appId, app] of enabledApps) {
      try {
        console.log(`\n--- Deploying ${app.name} (${appId}) ---`);
        results[appId] = await this.deployApp(appId, options);
      } catch (error) {
        console.error(`❌ Failed to deploy ${appId}: ${error.message}`);
        results[appId] = { success: false, error: error.message };
      }
    }

    return results;
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
}