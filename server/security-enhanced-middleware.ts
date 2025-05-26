
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { enhancedDbManager } from './enhanced-db-connection-manager';
import { createHash } from 'crypto';

interface SecurityEvent {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

interface UserSession {
  userId: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  ip: string;
  userAgent: string;
  permissions: string[];
}

class SecurityMiddleware {
  private securityEvents: SecurityEvent[] = [];
  private activeSessions = new Map<string, UserSession>();
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Set<string>();
  
  constructor() {
    this.initializeSecurityTables();
    this.startSecurityMonitoring();
  }
  
  private async initializeSecurityTables(): Promise<void> {
    try {
      // Create security audit table if it doesn't exist
      await enhancedDbManager.query(`
        CREATE TABLE IF NOT EXISTS security_audit_log (
          id BIGSERIAL PRIMARY KEY,
          event_time TIMESTAMPTZ DEFAULT NOW(),
          user_id UUID,
          session_id VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          success BOOLEAN DEFAULT true,
          risk_level VARCHAR(20) DEFAULT 'low',
          details JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Create index for audit queries
      await enhancedDbManager.query(`
        CREATE INDEX IF NOT EXISTS idx_security_audit_user_time 
        ON security_audit_log(user_id, event_time DESC)
      `);
      
      // Create user sessions table
      await enhancedDbManager.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_activity TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          is_active BOOLEAN DEFAULT true
        )
      `);
      
      console.log('✅ Security tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize security tables:', error);
    }
  }
  
  private startSecurityMonitoring(): void {
    // Clean up old events and sessions every hour
    setInterval(() => {
      this.cleanupOldEvents();
      this.cleanupExpiredSessions();
      this.analyzeSuspiciousActivity();
    }, 3600000);
  }
  
  private cleanupOldEvents(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 3600000;
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > oneWeekAgo);
  }
  
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      await enhancedDbManager.query(
        'UPDATE user_sessions SET is_active = false WHERE expires_at < NOW() AND is_active = true'
      );
      
      // Clean up in-memory sessions
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (Date.now() - session.lastActivity > 24 * 3600000) {
          this.activeSessions.delete(sessionId);
        }
      }
    } catch (error) {
      console.error('❌ Session cleanup failed:', error);
    }
  }
  
  private analyzeSuspiciousActivity(): void {
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp < 3600000
    );
    
    // Detect IP addresses with high failure rate
    const ipFailures = new Map<string, number>();
    const ipTotal = new Map<string, number>();
    
    recentEvents.forEach(event => {
      ipTotal.set(event.ip, (ipTotal.get(event.ip) || 0) + 1);
      if (!event.success) {
        ipFailures.set(event.ip, (ipFailures.get(event.ip) || 0) + 1);
      }
    });
    
    for (const [ip, failures] of ipFailures.entries()) {
      const total = ipTotal.get(ip) || 0;
      const failureRate = failures / total;
      
      if (failureRate > 0.5 && failures > 10) {
        this.suspiciousIPs.add(ip);
        console.log(`🚨 Suspicious activity detected from IP: ${ip}`);
        
        if (failures > 50) {
          this.blockedIPs.add(ip);
          console.log(`🛡️ IP blocked due to excessive failures: ${ip}`);
        }
      }
    }
  }
  
  // Middleware functions
  getSecurityMiddleware() {
    return [
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false
      }),
      this.ipBlockingMiddleware.bind(this),
      this.auditMiddleware.bind(this),
      this.sessionValidationMiddleware.bind(this)
    ];
  }
  
  private ipBlockingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const clientIP = this.getClientIP(req);
    
    if (this.blockedIPs.has(clientIP)) {
      this.logSecurityEvent({
        action: 'blocked_ip_access',
        resource: req.path,
        ip: clientIP,
        userAgent: req.get('User-Agent') || '',
        success: false,
        riskLevel: 'critical'
      });
      
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (this.suspiciousIPs.has(clientIP)) {
      // Add delay for suspicious IPs
      setTimeout(() => next(), 2000);
    } else {
      next();
    }
  }
  
  private auditMiddleware(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const riskLevel = this.assessRiskLevel(req, res.statusCode, duration);
      
      this.logSecurityEvent({
        action: `${req.method}_${req.path}`,
        resource: req.path,
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent') || '',
        success: res.statusCode < 400,
        riskLevel,
        details: {
          method: req.method,
          statusCode: res.statusCode,
          duration,
          body: req.method === 'POST' ? this.sanitizeBody(req.body) : undefined
        }
      });
    });
    
    next();
  }
  
  private sessionValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
    const sessionToken = req.get('Authorization')?.replace('Bearer ', '') || req.cookies?.sessionToken;
    
    if (sessionToken) {
      this.validateSession(sessionToken, req)
        .then(session => {
          if (session) {
            (req as any).session = session;
            (req as any).userId = session.userId;
          }
          next();
        })
        .catch(error => {
          console.error('Session validation error:', error);
          next();
        });
    } else {
      next();
    }
  }
  
  private async validateSession(sessionToken: string, req: Request): Promise<UserSession | null> {
    try {
      const sessionHash = createHash('sha256').update(sessionToken).digest('hex');
      
      const result = await enhancedDbManager.query(
        'SELECT * FROM user_sessions WHERE session_token = $1 AND is_active = true AND expires_at > NOW()',
        [sessionHash],
        { cache: true, cacheTTL: 60000 }
      );
      
      if (result.length === 0) {
        return null;
      }
      
      const dbSession = result[0];
      const clientIP = this.getClientIP(req);
      
      // Validate IP consistency (optional - might be too strict for some use cases)
      // if (dbSession.ip_address && dbSession.ip_address !== clientIP) {
      //   this.logSecurityEvent({
      //     action: 'session_ip_mismatch',
      //     resource: 'session_validation',
      //     ip: clientIP,
      //     userAgent: req.get('User-Agent') || '',
      //     success: false,
      //     riskLevel: 'high',
      //     details: { 
      //       sessionIP: dbSession.ip_address, 
      //       requestIP: clientIP 
      //     }
      //   });
      //   return null;
      // }
      
      // Update last activity
      await enhancedDbManager.query(
        'UPDATE user_sessions SET last_activity = NOW() WHERE id = $1',
        [dbSession.id]
      );
      
      const session: UserSession = {
        userId: dbSession.user_id,
        sessionId: dbSession.id,
        createdAt: new Date(dbSession.created_at).getTime(),
        lastActivity: Date.now(),
        ip: clientIP,
        userAgent: req.get('User-Agent') || '',
        permissions: [] // Would load from user roles
      };
      
      this.activeSessions.set(sessionToken, session);
      return session;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }
  
  private logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };
    
    this.securityEvents.push(securityEvent);
    
    // Log to database asynchronously
    this.persistSecurityEvent(securityEvent).catch(error => {
      console.error('Failed to persist security event:', error);
    });
    
    // Log critical events immediately
    if (event.riskLevel === 'critical') {
      console.warn(`🚨 CRITICAL SECURITY EVENT: ${event.action} from ${event.ip}`);
    }
  }
  
  private async persistSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await enhancedDbManager.query(`
        INSERT INTO security_audit_log 
        (user_id, session_id, action, resource, ip_address, user_agent, success, risk_level, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        event.userId || null,
        null, // session ID would be extracted from event if available
        event.action,
        event.resource,
        event.ip,
        event.userAgent,
        event.success,
        event.riskLevel,
        JSON.stringify(event.details || {})
      ]);
    } catch (error) {
      console.error('Failed to persist security event:', error);
    }
  }
  
  private getClientIP(req: Request): string {
    return (req.get('x-forwarded-for') || 
            req.get('x-real-ip') || 
            req.connection.remoteAddress || 
            req.socket.remoteAddress || 
            '').split(',')[0].trim() || 'unknown';
  }
  
  private assessRiskLevel(req: Request, statusCode: number, duration: number): SecurityEvent['riskLevel'] {
    if (statusCode === 401 || statusCode === 403) return 'high';
    if (statusCode >= 500) return 'medium';
    if (duration > 10000) return 'medium';
    if (req.path.includes('admin') || req.path.includes('config')) return 'medium';
    return 'low';
  }
  
  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  // Rate limiting configurations
  getApiRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
  
  getAuthRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10, // Stricter limit for auth endpoints
      message: 'Too many authentication attempts',
      skipSuccessfulRequests: true,
    });
  }
  
  getResearchRateLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 research requests per minute
      message: 'Research rate limit exceeded',
    });
  }
  
  // Public API methods
  getSecurityReport(): {
    recentEvents: SecurityEvent[];
    suspiciousIPs: string[];
    blockedIPs: string[];
    activeSessions: number;
    riskSummary: Record<string, number>;
  } {
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp < 24 * 3600000
    );
    
    const riskSummary = {
      low: recentEvents.filter(e => e.riskLevel === 'low').length,
      medium: recentEvents.filter(e => e.riskLevel === 'medium').length,
      high: recentEvents.filter(e => e.riskLevel === 'high').length,
      critical: recentEvents.filter(e => e.riskLevel === 'critical').length
    };
    
    return {
      recentEvents: recentEvents.slice(-50),
      suspiciousIPs: Array.from(this.suspiciousIPs),
      blockedIPs: Array.from(this.blockedIPs),
      activeSessions: this.activeSessions.size,
      riskSummary
    };
  }
  
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    console.log(`✅ IP unblocked: ${ip}`);
  }
  
  blockIP(ip: string): void {
    this.blockedIPs.add(ip);
    console.log(`🛡️ IP manually blocked: ${ip}`);
  }
}

export const securityMiddleware = new SecurityMiddleware();
export default securityMiddleware;
