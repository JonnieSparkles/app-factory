// Arweave and Turbo SDK utilities

import { TurboFactory, ArweaveSigner as TurboArweaveSigner } from '@ardrive/turbo-sdk';
import { guessContentType, loadConfig } from './utils.js';
import fs from 'fs/promises';

// ---------- wallet loading functions ----------
export async function loadWallet() {
  try {
    const config = loadConfig();

    // Prefer raw JSON from environment (works best in CI with GitHub Secrets)
    if (config.walletJson) {
      console.log(`🔑 Loading wallet from environment variable`);
      return JSON.parse(config.walletJson);
    }

    // Fallback to wallet file path if available and readable
    if (config.walletPath) {
      try {
        console.log(`🔑 Loading wallet from: ${config.walletPath}`);
        const walletData = await fs.readFile(config.walletPath, 'utf-8');
        return JSON.parse(walletData);
      } catch (fileError) {
        console.error(`⚠️ Wallet file not accessible at ${config.walletPath}:`, fileError.message);
      }
    }

    throw new Error('No wallet configuration found. Set ARWEAVE_JWK_JSON or provide a valid ARWEAVE_WALLET_PATH');
  } catch (error) {
    console.error(`❌ Error loading wallet:`, error.message);
    throw error;
  }
}

// ---------- utility functions ----------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadWithRetry(uploadFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`🔄 Upload attempt ${i + 1} failed, retrying in ${2 ** i} seconds...`);
      await sleep(2 ** i * 1000);  // Exponential backoff: 1s, 2s, 4s
    }
  }
}

// ---------- upload functions ----------
export async function uploadToArweave(mediaBuffer, contentType = 'application/octet-stream', appName = null, jwk = null, customTags = []) {
  try {
    console.log(`☁️ Uploading ${(mediaBuffer.length / 1024).toFixed(1)}KB to Arweave...`);
    
    // Load wallet if not provided
    if (!jwk) {
      jwk = await loadWallet();
    }
    
    // Load config for shared credits and app name
    const config = loadConfig();
    if (!appName) {
      appName = config.appName;
    }
    
    const turbo = getTurboClient(jwk);
    
    // Check Turbo balance first
    const balance = await turbo.getBalance();
    console.log(`💰 Current Turbo balance: ${balance} winc`);
    
    // Determine payment strategy based on config
    const dataItemOpts = {
      tags: [
        { name: 'Content-Type', value: contentType },
        { name: 'App-Name', value: appName },
        ...customTags
      ]
    };
    
    // Add shared credits configuration if enabled
    if (config.useSharedCredits) {
      if (config.sharedCreditsPaidBy && config.sharedCreditsPaidBy.length > 0) {
        // Use specific wallet addresses that have shared credits with us
        console.log(`🔗 Using shared credits from: ${config.sharedCreditsPaidBy.join(', ')}`);
        dataItemOpts.paidBy = config.sharedCreditsPaidBy;
      } else {
        // Automatically get received approvals like the CLI does
        try {
          const balance = await turbo.getBalance();
          if (balance.receivedApprovals && balance.receivedApprovals.length > 0) {
            // Get paying addresses from received approvals (payment system handles duplicates gracefully)
            const paidBy = balance.receivedApprovals.map((approval) => approval.payingAddress);
            console.log(`🔗 Using shared credits from received approvals: ${paidBy.join(', ')}`);
            dataItemOpts.paidBy = paidBy;
          } else {
            console.log(`🔗 No shared credits found - will use native balance`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not check for shared credits: ${error.message}`);
          console.log(`🔗 Will use native balance`);
        }
      }
    }
    
    // Upload file with retry logic
    const uploadResult = await uploadWithRetry(() => 
      turbo.uploadFile({
        fileStreamFactory: () => Buffer.from(mediaBuffer),
        fileSizeFactory: () => mediaBuffer.length,
        dataItemOpts: dataItemOpts
      })
    );
    
    console.log(`✅ Uploaded: ${uploadResult.id} (${uploadResult.winc} winc)`);
    
    return uploadResult.id;
  } catch (error) {
    console.error(`❌ Arweave upload failed:`, error);
    throw error;
  }
}

export async function downloadMedia(mediaUrl) {
  try {
    console.log(`📥 Downloading: ${mediaUrl.split('/').pop()}`);
    const response = await fetch(mediaUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    console.log(`✅ Downloaded ${(buffer.byteLength / 1024).toFixed(1)}KB`);
    return Buffer.from(buffer);
  } catch (error) {
    console.error(`❌ Media download failed:`, error);
    throw error;
  }
}

export async function downloadBuffer(url) {
  const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
  const contentType = head?.ok ? head.headers.get('content-type') : null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const arr = await res.arrayBuffer();
  return { buffer: Buffer.from(arr), contentType };
}

// ---------- turbo client factory ----------
let turboClient = null;

export function getTurboClient(jwk) {
  if (!turboClient) {
    turboClient = TurboFactory.authenticated({ 
      signer: new TurboArweaveSigner(jwk) 
    });
  }
  return turboClient;
}

// ---------- manifest functions ----------
export function createManifest(pathMap, indexPath = 'index.html') {
  // Create an Arweave manifest structure
  // pathMap is an object like: { 'index.html': 'txId1', 'style.css': 'txId2' }
  const manifest = {
    manifest: 'arweave/paths',
    version: '0.2.0',
    index: {
      path: indexPath
    },
    paths: {}
  };

  // Add all paths to the manifest
  for (const [filePath, txId] of Object.entries(pathMap)) {
    manifest.paths[filePath] = {
      id: txId
    };
  }

  return manifest;
}

export async function uploadManifest(pathMap, indexPath = 'index.html', appName = null, jwk = null) {
  try {
    // Create the manifest JSON
    const manifest = createManifest(pathMap, indexPath);
    const manifestJson = JSON.stringify(manifest, null, 2);
    
    console.log(`📋 Creating manifest with ${Object.keys(pathMap).length} files...`);
    console.log(`   Index: ${indexPath}`);
    
    // Load wallet if not provided
    if (!jwk) {
      jwk = await loadWallet();
    }
    
    // Load config for shared credits and app name
    const config = loadConfig();
    if (!appName) {
      appName = config.appName;
    }
    
    const turbo = getTurboClient(jwk);
    
    // Build data item options with shared credits support
    const dataItemOpts = {
      tags: [
        { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
        { name: 'Type', value: 'manifest' },
        { name: 'App-Name', value: appName }
      ]
    };
    
    // Add shared credits configuration if enabled
    if (config.useSharedCredits) {
      if (config.sharedCreditsPaidBy && config.sharedCreditsPaidBy.length > 0) {
        // Use specific wallet addresses that have shared credits with us
        console.log(`🔗 Using shared credits for manifest from: ${config.sharedCreditsPaidBy.join(', ')}`);
        dataItemOpts.paidBy = config.sharedCreditsPaidBy;
      } else {
        // Automatically get received approvals like the CLI does
        try {
          const balance = await turbo.getBalance();
          if (balance.receivedApprovals && balance.receivedApprovals.length > 0) {
            // Get paying addresses from received approvals (payment system handles duplicates gracefully)
            const paidBy = balance.receivedApprovals.map((approval) => approval.payingAddress);
            console.log(`🔗 Using shared credits for manifest from received approvals: ${paidBy.join(', ')}`);
            dataItemOpts.paidBy = paidBy;
          } else {
            console.log(`🔗 No shared credits found for manifest - will use native balance`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not check for shared credits for manifest: ${error.message}`);
          console.log(`🔗 Will use native balance for manifest`);
        }
      }
    }
    
    // Upload the manifest with retry logic
    const uploadResult = await uploadWithRetry(() => 
      turbo.uploadFile({
        fileStreamFactory: () => Buffer.from(manifestJson, 'utf-8'),
        fileSizeFactory: () => Buffer.byteLength(manifestJson, 'utf-8'),
        dataItemOpts: dataItemOpts
      })
    );
    
    console.log(`✅ Manifest uploaded: ${uploadResult.id}`);
    
    return uploadResult.id;
  } catch (error) {
    console.error(`❌ Manifest upload failed:`, error);
    throw error;
  }
}
