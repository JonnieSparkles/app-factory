// Deployment logging system for tracking uploads in JSON and CSV formats

import fs from 'fs/promises';
import path from 'path';
import { postDeploymentNotification } from './twitter.js';

// ---------- Log file paths ----------
const LOGS_DIR = './logs';
const JSON_LOG_FILE = path.join(LOGS_DIR, 'deployments.json');
const CSV_LOG_FILE = path.join(LOGS_DIR, 'deployments.csv');

// ---------- Ensure logs directory exists ----------
async function ensureLogsDirectory() {
  try {
    await fs.access(LOGS_DIR);
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    console.log(`📁 Created logs directory: ${LOGS_DIR}`);
  }
}

// ---------- JSON logging functions ----------
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
    
    // Write back to file
    await fs.writeFile(JSON_LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    
    console.log(`📝 Logged to JSON: ${JSON_LOG_FILE}`);
    return logEntry;
  } catch (error) {
    console.error(`❌ JSON logging failed:`, error.message);
    throw error;
  }
}

// ---------- CSV logging functions ----------
export async function logToCSV(deploymentData) {
  await ensureLogsDirectory();
  
  try {
    // Check if CSV file exists to determine if we need headers
    let needsHeaders = false;
    try {
      await fs.access(CSV_LOG_FILE);
    } catch {
      needsHeaders = true;
    }
    
    // Prepare CSV row
    const csvRow = [
      new Date().toISOString(),
      deploymentData.success ? 'SUCCESS' : 'FAILED',
      deploymentData.filePath || '',
      deploymentData.commitHash || '',
      deploymentData.txId || '',
      deploymentData.undername || '',
      deploymentData.fileSize || 0,
      deploymentData.duration || 0,
      deploymentData.ttl || 0,
      deploymentData.arnsRecordId || '',
      deploymentData.error || '',
      deploymentData.alreadyDeployed ? 'YES' : 'NO',
      deploymentData.dryRun ? 'YES' : 'NO'
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    
    // Add headers if needed
    if (needsHeaders) {
      const headers = [
        'timestamp',
        'status',
        'file_path',
        'commit_hash',
        'tx_id',
        'undername',
        'file_size_bytes',
        'duration_ms',
        'ttl_seconds',
        'arns_record_id',
        'error_message',
        'already_deployed',
        'dry_run'
      ].map(header => `"${header}"`).join(',');
      
      await fs.writeFile(CSV_LOG_FILE, headers + '\n' + csvRow + '\n', 'utf-8');
    } else {
      await fs.appendFile(CSV_LOG_FILE, csvRow + '\n', 'utf-8');
    }
    
    console.log(`📊 Logged to CSV: ${CSV_LOG_FILE}`);
  } catch (error) {
    console.error(`❌ CSV logging failed:`, error.message);
    throw error;
  }
}

// ---------- Combined logging function ----------
export async function logDeployment(deploymentData) {
  try {
    console.log(`\n📋 Logging deployment results...`);
    
    // Log to both formats
    await Promise.all([
      logToJSON(deploymentData),
      logToCSV(deploymentData)
    ]);
    
    console.log(`✅ Deployment logged successfully`);
    
    // Post to Twitter if configured
    try {
      const twitterResult = await postDeploymentNotification(deploymentData);
      if (twitterResult.success) {
        console.log('🐦 Twitter notification posted successfully');
      } else if (twitterResult.reason !== 'not_configured' && twitterResult.reason !== 'test_mode' && twitterResult.reason !== 'already_deployed') {
        console.log(`🐦 Twitter notification skipped: ${twitterResult.reason}`);
      }
    } catch (error) {
      console.error('🐦 Twitter notification failed:', error.message);
    }
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

export async function readCSVLogs() {
  try {
    const data = await fs.readFile(CSV_LOG_FILE, 'utf-8');
    const lines = data.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });
    return rows;
  } catch (error) {
    console.error(`❌ Failed to read CSV logs:`, error.message);
    return [];
  }
}

// ---------- Log statistics ----------
export async function getLogStats() {
  try {
    const jsonLogs = await readJSONLogs();
    const csvLogs = await readCSVLogs();
    
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
    
    // Clear both log files
    await Promise.all([
      fs.writeFile(JSON_LOG_FILE, '[]', 'utf-8'),
      fs.writeFile(CSV_LOG_FILE, '', 'utf-8')
    ]);
    
    console.log(`🗑️ Cleared all deployment logs`);
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
    const csvArchive = path.join(archiveDir, `${archiveFileName}.csv`);
    
    await Promise.all([
      fs.copyFile(JSON_LOG_FILE, jsonArchive),
      fs.copyFile(CSV_LOG_FILE, csvArchive)
    ]);
    
    console.log(`📦 Archived logs to: ${archiveDir}/${archiveFileName}`);
    
    // Clear current logs
    await clearLogs();
    
    return { archiveDir, archiveFileName };
  } catch (error) {
    console.error(`❌ Failed to archive logs:`, error.message);
    throw error;
  }
}
