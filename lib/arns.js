// ArNS (Arweave Name Service) utilities

import { logger } from './logger.js';

// ---------- ArNS functions ----------
export async function checkUndernameAvailability(ant, undername) {
  try {
    const existingRecords = await ant.getRecords();
    if (existingRecords && existingRecords[undername]) {
      return { available: false, existing: existingRecords[undername] };
    }
    return { available: true, existing: null };
  } catch (error) {
    logger.showError('Error checking undername availability', error);
    // Return available=true to allow attempt (better to try and fail than block on API issues)
    return { available: true, existing: null, error: error.message };
  }
}

export async function createUndernameRecord(ant, undername, txId, ttlSeconds) {
  try {
    logger.showArNSOperation('Creating', undername, txId);
    logger.info(`🔍 Using TTL: ${ttlSeconds} seconds`);
    
    const result = await Promise.race([
      ant.setUndernameRecord({
        undername: undername,
        transactionId: txId,
        ttlSeconds: ttlSeconds
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('ArNS assignment timeout after 120 seconds')), 120000)
      )
    ]);
    
    logger.success(`ArNS record created: ${result.id}`);
    return { success: true, recordId: result.id, result };
  } catch (error) {
    logger.showError('ArNS record creation failed', error);
    
    // Check if it's a "name taken" error
    if (error.message?.includes('already exists') || error.message?.includes('taken')) {
      return { success: false, error: 'undername_taken', message: error.message };
    }
    
    // Check if it's a timeout error - verify if assignment actually succeeded
    if (error.message?.includes('timeout')) {
      logger.showTimeout('ArNS assignment');
      try {
        const records = await ant.getRecords();
        if (records && records[undername]) {
          logger.success(`Assignment succeeded despite timeout! Found record: ${records[undername].id}`);
          return { success: true, recordId: records[undername].id, result: records[undername] };
        }
        logger.error(`Assignment actually failed - record not found`);
        return { success: false, error: 'timeout', message: 'Assignment failed after timeout' };
      } catch (verifyError) {
        logger.warning(`Could not verify assignment status: ${verifyError.message}`);
        return { success: false, error: 'timeout', message: 'Assignment failed after timeout' };
      }
    }
    
    return { success: false, error: 'creation_failed', message: error.message };
  }
}

export async function updateUndernameRecord(ant, undername, txId, ttlSeconds) {
  try {
    logger.showArNSOperation('Updating', undername, txId);
    logger.info(`🔍 Using TTL: ${ttlSeconds} seconds`);
    
    const result = await Promise.race([
      ant.setUndernameRecord({
        undername: undername,
        transactionId: txId,
        ttlSeconds: ttlSeconds
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('ArNS assignment timeout after 120 seconds')), 120000)
      )
    ]);
    
    logger.success(`ArNS record updated: ${result.id}`);
    return { success: true, recordId: result.id, result };
  } catch (error) {
    logger.showError('ArNS record update failed', error);
    
    // Check if it's a timeout error - verify if assignment actually succeeded
    if (error.message?.includes('timeout')) {
      logger.showTimeout('ArNS assignment');
      try {
        const records = await ant.getRecords();
        if (records && records[undername]) {
          logger.success(`Assignment succeeded despite timeout! Found record: ${records[undername].id}`);
          return { success: true, recordId: records[undername].id, result: records[undername] };
        }
        logger.error(`Assignment actually failed - record not found`);
        return { success: false, error: 'timeout', message: 'Assignment failed after timeout' };
      } catch (verifyError) {
        logger.warning(`Could not verify assignment status: ${verifyError.message}`);
        return { success: false, error: 'timeout', message: 'Assignment failed after timeout' };
      }
    }
    
    return { success: false, error: 'update_failed', message: error.message };
  }
}

export async function getUndernameRecord(ant, undername) {
  try {
    const records = await ant.getRecords();
    return records?.[undername] || null;
  } catch (error) {
    logger.showError('Error getting undername record', error);
    
    // If the error is due to JSON parsing (ArNS service returning HTML), 
    // log a more helpful message and return null to allow deployment to continue
    if (error.message && error.message.includes('Unexpected token')) {
      logger.warning(`ArNS service appears to be returning HTML instead of JSON. This may be a temporary service issue.`);
      logger.info(`Deployment will continue without ArNS record check.`);
    }
    
    return null;
  }
}