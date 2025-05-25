/**
 * Database resilience system to prevent timeouts from crashing the Research Agent
 */

export class DatabaseTimeoutHandler {
  private static timeoutHandlers = new Map<string, NodeJS.Timeout>();
  private static connectionRetries = new Map<string, number>();

  static preventDatabaseCrash() {
    // Catch all database-related errors
    process.on('uncaughtException', (error) => {
      if (this.isDatabaseError(error)) {
        console.error('🛡️ Database error caught - keeping Research Agent alive:', error.message);
        return; // Don't crash the server
      }
      throw error; // Re-throw non-database errors
    });

    process.on('unhandledRejection', (reason: any) => {
      if (this.isDatabaseError(reason)) {
        console.error('🛡️ Database promise rejection caught - keeping Research Agent alive:', reason?.message);
        return; // Don't crash the server
      }
      throw reason; // Re-throw non-database rejections
    });
  }

  private static isDatabaseError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStack = error?.stack?.toLowerCase() || '';
    
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('postgresql') ||
      errorMessage.includes('database') ||
      errorMessage.includes('pool') ||
      errorStack.includes('pg') ||
      errorStack.includes('postgres')
    );
  }

  static wrapDatabaseOperation<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 10000,
    fallbackValue?: T
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Database operation timed out - using fallback');
        if (fallbackValue !== undefined) {
          resolve(fallbackValue);
        } else {
          reject(new Error('Database operation timed out'));
        }
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (this.isDatabaseError(error)) {
            console.error('🛡️ Database operation failed:', error.message);
            if (fallbackValue !== undefined) {
              resolve(fallbackValue);
            } else {
              reject(error);
            }
          } else {
            reject(error);
          }
        });
    });
  }
}

// Initialize database resilience
DatabaseTimeoutHandler.preventDatabaseCrash();