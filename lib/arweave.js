// Arweave and Turbo SDK utilities

import { TurboFactory, ArweaveSigner as TurboArweaveSigner } from '@ardrive/turbo-sdk';
import { guessContentType, loadConfig } from './utils.js';
import fs from 'fs/promises';

// ---------- wallet loading functions ----------
export async function loadWallet() {
  try {
    const config = loadConfig();
    
    // Try to load from file first
    if (config.walletPath) {
      console.log(`🔑 Loading wallet from: ${config.walletPath}`);
      const walletData = await fs.readFile(config.walletPath, 'utf-8');
      return JSON.parse(walletData);
    }
    
    // Fallback to raw JSON from environment
    if (config.walletJson) {
      console.log(`🔑 Loading wallet from environment variable`);
      return JSON.parse(config.walletJson);
    }
    
    throw new Error('No wallet configuration found. Set ARWEAVE_WALLET_PATH or ARWEAVE_JWK_JSON');
  } catch (error) {
    console.error(`❌ Error loading wallet:`, error.message);
    throw error;
  }
}

// ---------- upload functions ----------
export async function uploadToArweave(mediaBuffer, contentType = 'application/octet-stream', appName = null, jwk = null) {
  try {
    console.log(`☁️ Uploading ${(mediaBuffer.length / 1024).toFixed(1)}KB to Arweave...`);
    
    // Load wallet if not provided
    if (!jwk) {
      jwk = await loadWallet();
    }
    
    // Use config app name if not provided
    if (!appName) {
      const config = loadConfig();
      appName = config.appName;
    }
    
    const turbo = getTurboClient(jwk);
    
    // Check Turbo balance first
    const balance = await turbo.getBalance();
    
    // Upload file
    const uploadResult = await turbo.uploadFile({
      fileStreamFactory: () => Buffer.from(mediaBuffer),
      fileSizeFactory: () => mediaBuffer.length,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: contentType },
          { name: 'App-Name', value: appName },
          { name: 'App-Version', value: '1.0.0' }
        ]
      }
    });
    
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
