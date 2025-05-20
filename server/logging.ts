/**
 * Centralized logging utilities for the application
 */

/**
 * Log a message with an optional category
 */
export function log(message: string, category?: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = category ? `[${category}]` : '';
  console.log(`${timestamp} ${prefix} ${message}`);
}

/**
 * Log an error with an optional category
 */
export function logError(error: Error | string, category?: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = category ? `[${category}]` : '';
  const errorMessage = error instanceof Error ? `${error.message}\n${error.stack}` : error;
  console.error(`${timestamp} ${prefix} ERROR: ${errorMessage}`);
}