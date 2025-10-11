// Utility functions for the remote agent deployment system

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// ---------- Hash and commit functions ----------
export function generateCommitHash(content, timestamp = null) {
  const time = timestamp || new Date().toISOString();
  const data = `${content}\n${time}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateShortHash(fullHash) {
  return fullHash.substring(0, 16);
}

// ---------- File operations ----------
export async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    throw error;
  }
}

export async function writeFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✅ File written: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error writing file ${filePath}:`, error.message);
    throw error;
  }
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ---------- Content type detection ----------
export function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// ---------- Environment and configuration ----------
export function loadConfig() {
  const config = {
    // ArNS Configuration
    antProcessId: process.env.ANT_PROCESS_ID,
    ownerArnsName: process.env.OWNER_ARNS_NAME,
    walletAddress: process.env.WALLET_ADDRESS,
    
    // Wallet Configuration (supports both file path and raw JSON)
    walletPath: process.env.ARWEAVE_WALLET_PATH || './secrets/wallet.json',
    walletJson: process.env.ARWEAVE_JWK_JSON,
    
    // TTL Configuration (supports both naming conventions)
    arnsTtl: parseInt(process.env.ARNS_UNDERNAME_TTL) || 
             parseInt(process.env.DEFAULT_TTL_SECONDS) || 
             31536000, // 1 year default
    
    // Turbo Configuration
    turboPaymentUrl: process.env.TURBO_PAYMENT_SERVICE_URL || 'https://payment.ardrive.dev',
    turboUploadUrl: process.env.TURBO_UPLOAD_SERVICE_URL || 'https://upload.ardrive.dev',
    
    // Application Configuration
    appName: process.env.APP_NAME || 'RemoteAgentDeploy',
    arweaveGateway: process.env.ARWEAVE_GATEWAY || 'https://arweave.net',
    
    // Optional Server Configuration
    port: parseInt(process.env.PORT) || 3000
  };

  // Validate required config
  if (!config.antProcessId) {
    throw new Error('ANT_PROCESS_ID environment variable is required');
  }
  
  if (!config.ownerArnsName) {
    throw new Error('OWNER_ARNS_NAME environment variable is required');
  }

  return config;
}

// ---------- Logging and formatting ----------
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function logDeploymentResult(result) {
  console.log('\n🎉 Deployment complete!');
  console.log(`   File: ${result.filePath}`);
  console.log(`   Commit: ${result.commitHash}`);
  console.log(`   TX ID: ${result.txId}`);
  console.log(`   ArNS: ${result.undername} (expires in ${Math.floor(result.ttl / 86400)} days)`);
  console.log(`   Size: ${formatBytes(result.fileSize)}`);
  console.log(`   Duration: ${formatDuration(result.duration)}`);
}

// ---------- Error handling ----------
export function handleError(error, context = '') {
  console.error(`❌ ${context}Error:`, error.message);
  if (error.stack && process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
  return {
    success: false,
    error: error.message,
    context
  };
}

// ---------- Validation ----------
export function validateFileContent(content) {
  if (typeof content !== 'string') {
    throw new Error('File content must be a string');
  }
  if (content.length === 0) {
    throw new Error('File content cannot be empty');
  }
  if (content.length > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('File content too large (max 10MB)');
  }
  return true;
}

export function validateFilePath(filePath) {
  if (typeof filePath !== 'string') {
    throw new Error('File path must be a string');
  }
  if (filePath.includes('..') || filePath.startsWith('/')) {
    throw new Error('File path must be relative and not contain parent directory references');
  }
  return true;
}
