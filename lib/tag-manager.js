// Tag Manager for hierarchical upload tag configuration
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export class TagManager {
  constructor(appPath = null) {
    this.appPath = appPath;
    this.configs = new Map();
  }

  async load() {
    const configPaths = this.getConfigPaths();
    
    // Load configs in priority order (lowest to highest)
    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const configData = await readFile(configPath, 'utf8');
          const config = JSON.parse(configData);
          this.configs.set(configPath, config);
        } catch (error) {
          console.warn(`Failed to load config: ${configPath}`);
        }
      }
    }
    
    return this.getMergedConfig();
  }

  getConfigPaths() {
    const paths = [];
    
    // Global config (apps/upload-tags.json)
    paths.push('./apps/upload-tags.json');
    
    // App-specific config (if app path provided)
    if (this.appPath) {
      const appConfigPath = path.join(this.appPath, 'upload-tags.json');
      paths.push(appConfigPath);
    }
    
    return paths;
  }

  getMergedConfig() {
    const merged = { customTags: {} };
    
    // Merge configs in priority order
    for (const [configPath, config] of this.configs) {
      if (config.customTags) {
        Object.assign(merged.customTags, config.customTags);
      }
    }
    
    return merged;
  }

  getAllTags() {
    const mergedConfig = this.getMergedConfig();
    const tags = [];

    // Custom Tags from merged config
    if (mergedConfig.customTags) {
      Object.entries(mergedConfig.customTags).forEach(([name, value]) => {
        if (value !== null && value !== undefined) {
          tags.push({ name, value });
        }
      });
    }

    return tags;
  }
}
