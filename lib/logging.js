// Deployment logging system for tracking uploads in JSON format with rolling history

import fs from 'fs/promises';
import path from 'path';

// ---------- Configuration ----------
const LOGS_DIR = './logs';
const JSON_LOG_FILE = path.join(LOGS_DIR, 'deployments.json');
const MAX_LOG_ENTRIES = 10; // Keep only the last 10 deployments

// ---------- Ensure logs directory exists ----------
async function ensureLogsDirectory() {
  try {
    await fs.access(LOGS_DIR);
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    console.log(`📁 Created logs directory: ${LOGS_DIR}`);
  }
}

// ---------- JSON logging with rolling history ----------
export async function logToJSON(deploymentData) {
  await ensureLogsDirectory();
  
  try {
    // Read existing logs
    let logs = [];
    try {
      const existingData = await fs.readFile(JSON_LOG_FILE, 'utf-8');
      logs = JSON.parse(existingData);
    } catch {
      // File doesn't exist or is empty, start fresh
      logs = [];
    }
    
    // Add new deployment entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...deploymentData
    };
    
    logs.push(logEntry);
    
    // Keep only the most recent entries (rolling log)
    if (logs.length > MAX_LOG_ENTRIES) {
      logs = logs.slice(-MAX_LOG_ENTRIES);
    }
    
    // Write back to file
    await fs.writeFile(JSON_LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    
    console.log(`📝 Logged to JSON: ${JSON_LOG_FILE}`);
    return logEntry;
  } catch (error) {
    console.error(`❌ JSON logging failed:`, error.message);
    throw error;
  }
}

// ---------- Simplified logging function ----------
export async function logDeployment(deploymentData) {
  try {
    console.log(`\n📋 Logging deployment results...`);
    
    // Log only to JSON format
    await logToJSON(deploymentData);
    
    console.log(`✅ Deployment logged successfully`);
  } catch (error) {
    console.error(`❌ Deployment logging failed:`, error.message);
    // Don't throw - logging failure shouldn't break deployment
  }
}

// ---------- Log reading functions ----------
export async function readJSONLogs() {
  try {
    const data = await fs.readFile(JSON_LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to read JSON logs:`, error.message);
    return [];
  }
}

// ---------- Log statistics ----------
export async function getLogStats() {
  try {
    const jsonLogs = await readJSONLogs();
    
    const stats = {
      totalDeployments: jsonLogs.length,
      successfulDeployments: jsonLogs.filter(log => log.success).length,
      failedDeployments: jsonLogs.filter(log => !log.success).length,
      dryRuns: jsonLogs.filter(log => log.dryRun).length,
      alreadyDeployed: jsonLogs.filter(log => log.alreadyDeployed).length,
      totalFileSize: jsonLogs.reduce((sum, log) => sum + (log.fileSize || 0), 0),
      averageDuration: jsonLogs.length > 0 
        ? jsonLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / jsonLogs.length 
        : 0,
      lastDeployment: jsonLogs.length > 0 ? jsonLogs[jsonLogs.length - 1].timestamp : null
    };
    
    return stats;
  } catch (error) {
    console.error(`❌ Failed to get log stats:`, error.message);
    return null;
  }
}

// ---------- Log cleanup functions ----------
export async function clearLogs() {
  try {
    await ensureLogsDirectory();
    
    // Clear JSON log file
    await fs.writeFile(JSON_LOG_FILE, '[]', 'utf-8');
    
    console.log(`🗑️ Cleared deployment logs`);
  } catch (error) {
    console.error(`❌ Failed to clear logs:`, error.message);
    throw error;
  }
}

export async function archiveLogs(archiveName = null) {
  try {
    await ensureLogsDirectory();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(LOGS_DIR, 'archives');
    const archiveFileName = archiveName || `deployments-${timestamp}`;
    
    // Create archive directory
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Copy current logs to archive
    const jsonArchive = path.join(archiveDir, `${archiveFileName}.json`);
    
    await fs.copyFile(JSON_LOG_FILE, jsonArchive);
    
    console.log(`📦 Archived logs to: ${archiveDir}/${archiveFileName}.json`);
    
    // Clear current logs
    await clearLogs();
    
    return { archiveDir, archiveFileName };
  } catch (error) {
    console.error(`❌ Failed to archive logs:`, error.message);
    throw error;
  }
}