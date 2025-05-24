// Complete crash prevention system for server/suna-integration.ts
// This bypasses PostgreSQL entirely for research operations

import fs from 'fs/promises';
import path from 'path';

// File-based storage paths
const RESEARCH_BACKUP_DIR = path.join(process.cwd(), 'research-backups');
const RESEARCH_INDEX_FILE = path.join(RESEARCH_BACKUP_DIR, 'research-index.json');

// Ensure backup directory exists
async function ensureBackupDirectory() {
  try {
    await fs.mkdir(RESEARCH_BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.log('📁 Backup directory already exists or created');
  }
}

// Research result interface
interface ResearchBackup {
  conversationId: string;
  userId: string;
  query: string;
  results: any;
  timestamp: string;
  completed: boolean;
  filename: string;
}

// Load research index
async function loadResearchIndex(): Promise<ResearchBackup[]> {
  try {
    await ensureBackupDirectory();
    const indexData = await fs.readFile(RESEARCH_INDEX_FILE, 'utf8');
    return JSON.parse(indexData);
  } catch (error) {
    console.log('📋 Creating new research index');
    return [];
  }
}

// Save research index
async function saveResearchIndex(index: ResearchBackup[]) {
  try {
    await ensureBackupDirectory();
    await fs.writeFile(RESEARCH_INDEX_FILE, JSON.stringify(index, null, 2));
    console.log('✅ Research index saved successfully');
  } catch (error) {
    console.error('❌ Failed to save research index:', error);
  }
}

// CRASH-SAFE RESEARCH STORAGE
export async function storeResearchResultsCrashSafe(
  conversationId: string,
  userId: string,
  query: string,
  results: any
): Promise<{ success: boolean; filename?: string }> {
  try {
    console.log('💾 CRASH-SAFE: Storing research results...');
    
    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `research-${conversationId}-${timestamp}.json`;
    const filepath = path.join(RESEARCH_BACKUP_DIR, filename);
    
    // Store individual result file
    const resultData = {
      conversationId,
      userId,
      query,
      results,
      timestamp: new Date().toISOString(),
      completed: true,
      metadata: {
        storageType: 'crash-safe-file',
        serverVersion: '1.0.0',
        backupLocation: filepath
      }
    };
    
    await fs.writeFile(filepath, JSON.stringify(resultData, null, 2));
    console.log('✅ CRASH-SAFE: Individual result file saved:', filename);
    
    // Update research index
    const index = await loadResearchIndex();
    const existingIndex = index.findIndex(item => item.conversationId === conversationId);
    
    const indexEntry: ResearchBackup = {
      conversationId,
      userId,
      query,
      results,
      timestamp: new Date().toISOString(),
      completed: true,
      filename
    };
    
    if (existingIndex >= 0) {
      index[existingIndex] = indexEntry;
    } else {
      index.push(indexEntry);
    }
    
    await saveResearchIndex(index);
    console.log('✅ CRASH-SAFE: Research index updated');
    
    // NEVER attempt database storage - completely bypass PostgreSQL
    console.log('🛡️ CRASH-SAFE: PostgreSQL bypassed entirely');
    
    return { success: true, filename };
    
  } catch (error) {
    console.error('❌ CRASH-SAFE storage failed:', error);
    return { success: false };
  }
}

// CRASH-SAFE RESEARCH RETRIEVAL
export async function getResearchResultsCrashSafe(
  conversationId: string
): Promise<{ success: boolean; results?: any; source?: string }> {
  try {
    console.log('🔍 CRASH-SAFE: Retrieving research results for:', conversationId);
    
    // Load from research index first
    const index = await loadResearchIndex();
    const researchEntry = index.find(item => item.conversationId === conversationId);
    
    if (researchEntry) {
      console.log('✅ CRASH-SAFE: Found research in index');
      return {
        success: true,
        results: researchEntry.results,
        source: 'crash-safe-index'
      };
    }
    
    // Fallback: scan backup directory
    const backupFiles = await fs.readdir(RESEARCH_BACKUP_DIR);
    const matchingFile = backupFiles.find(file => 
      file.startsWith(`research-${conversationId}-`) && file.endsWith('.json')
    );
    
    if (matchingFile) {
      const filepath = path.join(RESEARCH_BACKUP_DIR, matchingFile);
      const fileData = await fs.readFile(filepath, 'utf8');
      const resultData = JSON.parse(fileData);
      
      console.log('✅ CRASH-SAFE: Found research in backup file');
      return {
        success: true,
        results: resultData.results,
        source: 'crash-safe-file'
      };
    }
    
    console.log('❌ CRASH-SAFE: No research results found');
    return { success: false };
    
  } catch (error) {
    console.error('❌ CRASH-SAFE retrieval failed:', error);
    return { success: false };
  }
}

// Get all research for a user (crash-safe)
export async function getUserResearchCrashSafe(userId: string): Promise<ResearchBackup[]> {
  try {
    const index = await loadResearchIndex();
    return index.filter(item => item.userId === userId);
  } catch (error) {
    console.error('❌ Failed to get user research:', error);
    return [];
  }
}

// Cleanup old research files (prevent disk space issues)
export async function cleanupOldResearch(maxAgeDays: number = 7) {
  try {
    const index = await loadResearchIndex();
    const cutoffDate = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    const validEntries = [];
    
    for (const entry of index) {
      if (new Date(entry.timestamp).getTime() > cutoffDate) {
        validEntries.push(entry);
      } else {
        // Delete old file
        try {
          const filepath = path.join(RESEARCH_BACKUP_DIR, entry.filename);
          await fs.unlink(filepath);
          console.log('🧹 Cleaned up old research file:', entry.filename);
        } catch (error) {
          console.log('⚠️ Could not delete old file:', entry.filename);
        }
      }
    }
    
    await saveResearchIndex(validEntries);
    console.log(`🧹 Cleanup complete: kept ${validEntries.length}, removed ${index.length - validEntries.length}`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Initialize crash-safe system
export async function initializeCrashSafeStorage() {
  try {
    await ensureBackupDirectory();
    console.log('🛡️ CRASH-SAFE storage system initialized');
    
    // Schedule daily cleanup
    setInterval(() => {
      cleanupOldResearch(7); // Keep 7 days of research
    }, 24 * 60 * 60 * 1000); // Run daily
    
  } catch (error) {
    console.error('❌ Failed to initialize crash-safe storage:', error);
  }
}

// Export the crash-safe functions to replace existing database calls
export const CrashSafeResearch = {
  store: storeResearchResultsCrashSafe,
  retrieve: getResearchResultsCrashSafe,
  getUserResearch: getUserResearchCrashSafe,
  cleanup: cleanupOldResearch,
  initialize: initializeCrashSafeStorage
};