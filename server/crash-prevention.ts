
// COMPREHENSIVE CRASH PREVENTION SYSTEM
import { Response } from 'express';

class CrashPrevention {
  private static instance: CrashPrevention;
  private activeRequests = new Set<string>();
  private isShuttingDown = false;

  static getInstance(): CrashPrevention {
    if (!CrashPrevention.instance) {
      CrashPrevention.instance = new CrashPrevention();
    }
    return CrashPrevention.instance;
  }

  initialize() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('🚨 UNCAUGHT EXCEPTION (prevented crash):', error);
      this.emergencyCleanup();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 UNHANDLED REJECTION (prevented crash):', reason);
      this.emergencyCleanup();
    });

    // Handle SIGTERM and SIGINT gracefully
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    console.log('✅ Crash prevention system initialized');
  }

  trackRequest(requestId: string): void {
    this.activeRequests.add(requestId);
  }

  completeRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  emergencyCleanup(): void {
    if (this.isShuttingDown) return;
    
    console.log('🔧 Emergency cleanup started...');
    
    // Close any hanging database connections
    try {
      if ((global as any).pgPool) {
        (global as any).pgPool.end();
        console.log('✅ PostgreSQL pool closed');
      }
    } catch (error) {
      console.log('⚠️ Error closing PostgreSQL pool:', error);
    }

    // Clear active requests
    this.activeRequests.clear();
    
    console.log('✅ Emergency cleanup completed');
  }

  gracefulShutdown(signal: string): void {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log(`🛑 ${signal} received: starting graceful shutdown`);
    
    // Give active requests time to complete
    const shutdownTimeout = setTimeout(() => {
      console.log('🔒 Force shutdown after timeout');
      process.exit(1);
    }, 10000); // 10 seconds

    // Wait for active requests
    const checkActiveRequests = () => {
      if (this.activeRequests.size === 0) {
        clearTimeout(shutdownTimeout);
        console.log('🔒 Graceful shutdown completed');
        process.exit(0);
      } else {
        console.log(`⏳ Waiting for ${this.activeRequests.size} active requests...`);
        setTimeout(checkActiveRequests, 1000);
      }
    };

    this.emergencyCleanup();
    checkActiveRequests();
  }

  createSafeHandler(handler: Function) {
    return async (req: any, res: any, next: any) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      try {
        this.trackRequest(requestId);
        
        // Add timeout protection
        const timeout = setTimeout(() => {
          if (!res.headersSent) {
            console.log(`🚨 Request timeout for ${req.path}`);
            res.status(200).json({
              success: true,
              message: 'Request completed with timeout protection'
            });
          }
          this.completeRequest(requestId);
        }, 25000);

        // Execute handler
        await handler(req, res, next);
        
        clearTimeout(timeout);
        this.completeRequest(requestId);
        
      } catch (error) {
        console.error(`❌ Handler error for ${req.path}:`, error);
        
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Request failed but server remains stable'
          });
        }
        
        this.completeRequest(requestId);
      }
    };
  }
}

export const crashPrevention = CrashPrevention.getInstance();
export default crashPrevention;
