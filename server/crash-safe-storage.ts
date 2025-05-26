import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';

// Configuration
const CONFIG = {
  BACKUP_DIR: path.join(process.cwd(), 'research-backups'),
  INDEX_FILE: 'research-index.json',
  COMPRESSION: true,
  MAX_AGE_DAYS: 7,
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_INDEX_SIZE: 10000, // Maximum entries in index
} as const;

// Research interfaces
interface ResearchBackup {
  conversationId: string;
  userId: string;
  query: string;
  results: any;
  timestamp: string;
  completed: boolean;
  filename: string;
  compressed?: boolean;
  size?: number;
}

interface StorageResult {
  success: boolean;
  filename?: string;
  error?: string;
}

interface RetrievalResult {
  success: boolean;
  results?: any;
  source?: string;
  error?: string;
}

export class CrashSafeStorage {
  private static instance: CrashSafeStorage;
  private indexCache: ResearchBackup[] | null = null;
  private indexLock = false;
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {}

  static getInstance(): CrashSafeStorage {
    if (!CrashSafeStorage.instance) {
      CrashSafeStorage.instance = new CrashSafeStorage();
    }
    return CrashSafeStorage.instance;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(CONFIG.BACKUP_DIR, { recursive: true });
      await this.loadIndex(); // Pre-load index into cache

      // Schedule cleanup
      this.cleanupTimer = setInterval(() => {
        this.cleanup().catch(console.error);
      }, CONFIG.CLEANUP_INTERVAL);

      console.log('🛡️ Crash-safe storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize crash-safe storage:', error);
    }
  }

  async store(
    conversationId: string,
    userId: string,
    query: string,
    results: any
  ): Promise<StorageResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = `research-${conversationId}-${timestamp}`;
      const filename = CONFIG.COMPRESSION ? `${baseFilename}.json.gz` : `${baseFilename}.json`;
      const filepath = path.join(CONFIG.BACKUP_DIR, filename);

      const resultData = {
        conversationId,
        userId,
        query,
        results,
        timestamp: new Date().toISOString(),
        completed: true,
        metadata: {
          storageType: 'crash-safe-file',
          compressed: CONFIG.COMPRESSION,
          backupLocation: filepath
        }
      };

      // Write file (compressed or not)
      if (CONFIG.COMPRESSION) {
        await this.writeCompressed(filepath, resultData);
      } else {
        await fs.writeFile(filepath, JSON.stringify(resultData, null, 2));
      }

      // Get file size
      const stats = await fs.stat(filepath);

      // Update index
      const indexEntry: ResearchBackup = {
        conversationId,
        userId,
        query: query.substring(0, 100), // Truncate for index
        results: null, // Don't store results in index
        timestamp: new Date().toISOString(),
        completed: true,
        filename,
        compressed: CONFIG.COMPRESSION,
        size: stats.size
      };

      await this.updateIndex(indexEntry);

      return { success: true, filename };
    } catch (error) {
      console.error('❌ Storage failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async retrieve(conversationId: string): Promise<RetrievalResult> {
    try {
      // Check cache first
      const index = await this.loadIndex();
      const entry = index.find(item => item.conversationId === conversationId);

      if (entry) {
        const filepath = path.join(CONFIG.BACKUP_DIR, entry.filename);

        // Read file (handle compression)
        const data = entry.compressed 
          ? await this.readCompressed(filepath)
          : JSON.parse(await fs.readFile(filepath, 'utf8'));

        return {
          success: true,
          results: data.results,
          source: 'crash-safe-file'
        };
      }

      return { success: false, error: 'Not found' };
    } catch (error) {
      console.error('❌ Retrieval failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getUserResearch(userId: string): Promise<ResearchBackup[]> {
    try {
      const index = await this.loadIndex();
      return index.filter(item => item.userId === userId);
    } catch (error) {
      console.error('❌ Failed to get user research:', error);
      return [];
    }
  }

  private async loadIndex(): Promise<ResearchBackup[]> {
    // Return cached index if available and not locked
    if (this.indexCache && !this.indexLock) {
      return this.indexCache;
    }

    try {
      const indexPath = path.join(CONFIG.BACKUP_DIR, CONFIG.INDEX_FILE);
      const indexData = await fs.readFile(indexPath, 'utf8');
      const index = JSON.parse(indexData);

      // Update cache
      this.indexCache = index;
      return index;
    } catch (error) {
      // Index doesn't exist, create new one
      this.indexCache = [];
      return [];
    }
  }

  private async updateIndex(entry: ResearchBackup): Promise<void> {
    this.indexLock = true;
    try {
      const index = await this.loadIndex();

      // Check if entry exists
      const existingIndex = index.findIndex(
        item => item.conversationId === entry.conversationId
      );

      if (existingIndex >= 0) {
        index[existingIndex] = entry;
      } else {
        index.push(entry);
      }

      // Maintain index size limit
      if (index.length > CONFIG.MAX_INDEX_SIZE) {
        index.splice(0, index.length - CONFIG.MAX_INDEX_SIZE);
      }

      // Save index
      const indexPath = path.join(CONFIG.BACKUP_DIR, CONFIG.INDEX_FILE);
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

      // Update cache
      this.indexCache = index;
    } finally {
      this.indexLock = false;
    }
  }

  private async writeCompressed(filepath: string, data: any): Promise<void> {
    const gzip = zlib.createGzip({ level: 9 });
    const jsonBuffer = Buffer.from(JSON.stringify(data));
    const source = createReadStream(jsonBuffer);
    const destination = createWriteStream(filepath);
    await pipeline(source, gzip, destination);
  }

  private async readCompressed(filepath: string): Promise<any> {
    const gunzip = zlib.createGunzip();
    const source = createReadStream(filepath);
    const chunks: Buffer[] = [];

    await pipeline(
      source,
      gunzip,
      async function* (source) {
        for await (const chunk of source) {
          chunks.push(chunk);
          yield chunk;
        }
      }
    );

    return JSON.parse(Buffer.concat(chunks).toString());
  }

  async cleanup(maxAgeDays: number = CONFIG.MAX_AGE_DAYS): Promise<void> {
    try {
      const index = await this.loadIndex();
      const cutoffDate = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

      const validEntries: ResearchBackup[] = [];
      const deletePromises: Promise<void>[] = [];

      for (const entry of index) {
        if (new Date(entry.timestamp).getTime() > cutoffDate) {
          validEntries.push(entry);
        } else {
          const filepath = path.join(CONFIG.BACKUP_DIR, entry.filename);
          deletePromises.push(
            fs.unlink(filepath).catch(err => 
              console.log(`⚠️ Could not delete: ${entry.filename}`)
            )
          );
        }
      }

      // Delete old files in parallel
      await Promise.all(deletePromises);

      // Update index
      this.indexCache = validEntries;
      const indexPath = path.join(CONFIG.BACKUP_DIR, CONFIG.INDEX_FILE);
      await fs.writeFile(indexPath, JSON.stringify(validEntries, null, 2));

      console.log(`🧹 Cleanup: kept ${validEntries.length}, removed ${index.length - validEntries.length}`);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Export singleton instance
export const crashSafeStorage = CrashSafeStorage.getInstance();