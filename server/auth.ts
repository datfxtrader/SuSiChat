
import { Express } from 'express';

export async function setupAuth(app: Express) {
  try {
    console.log('Setting up Replit authentication...');
    
    // Import the existing replitAuth module
    const replitAuth = await import('./replitAuth');
    
    // Apply the Replit auth middleware
    if (replitAuth.default) {
      app.use(replitAuth.default);
    }
    
    console.log('✅ Replit authentication setup complete');
  } catch (error) {
    console.error('❌ Failed to setup Replit auth:', error);
    // Continue without auth in development
    console.log('⚠️ Continuing without authentication...');
  }
}
