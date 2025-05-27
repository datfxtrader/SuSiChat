
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface AuthResult {
  authorized: boolean;
  user?: any;
  token?: string;
  reason?: string;
}

interface UserData {
  email: string;
  name?: string;
  picture?: string;
  googleId: string;
}

interface CachedUser {
  user: any;
  timestamp: number;
}

export class GoogleAuthService {
  private client: OAuth2Client;
  private whitelist: Set<string>;
  private userCache: Map<string, CachedUser> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  private whitelistLoaded = false;
  private whitelistLoadPromise: Promise<void> | null = null;

  constructor() {
    this.client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    
    this.whitelist = new Set();
    // Load whitelist asynchronously without blocking constructor
    this.initializeWhitelist();
  }

  async verifyAndAuthorize(idToken: string): Promise<AuthResult> {
    try {
      // Ensure whitelist is loaded
      await this.ensureWhitelistLoaded();

      // Verify Google token with timeout
      const ticket = await Promise.race([
        this.client.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Token verification timeout')), 5000)
        )
      ]);
      
      const payload = ticket.getPayload();
      const email = payload?.email?.toLowerCase();
      
      if (!email) {
        return {
          authorized: false,
          reason: 'No email in token'
        };
      }
      
      // Quick whitelist check
      if (!this.isWhitelisted(email)) {
        return {
          authorized: false,
          reason: 'Email not in whitelist'
        };
      }
      
      // Check cache first
      const cachedUser = this.getCachedUser(email);
      if (cachedUser) {
        return {
          authorized: true,
          user: cachedUser,
          token: this.generateJWT(cachedUser)
        };
      }
      
      // Create or update user with transaction
      const user = await this.findOrCreateUser({
        email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub
      });
      
      // Cache the user
      this.cacheUser(email, user);
      
      return {
        authorized: true,
        user,
        token: this.generateJWT(user)
      };
    } catch (error) {
      console.error('Auth error:', error);
      return {
        authorized: false,
        reason: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  async addToWhitelist(email: string, addedBy: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    
    // Check if already whitelisted
    if (this.isWhitelisted(normalizedEmail)) {
      return;
    }

    try {
      await db.query(
        'INSERT INTO whitelist (email, added_by) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
        [normalizedEmail, addedBy]
      );
      
      this.whitelist.add(normalizedEmail);
    } catch (error) {
      console.error('Error adding to whitelist:', error);
      throw error;
    }
  }

  async removeFromWhitelist(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    
    try {
      const result = await db.query(
        'DELETE FROM whitelist WHERE email = $1 RETURNING *',
        [normalizedEmail]
      );
      
      if (result.rowCount > 0) {
        this.whitelist.delete(normalizedEmail);
        // Clear user cache
        this.userCache.delete(normalizedEmail);
      }
    } catch (error) {
      console.error('Error removing from whitelist:', error);
      throw error;
    }
  }

  async getWhitelist(): Promise<any[]> {
    try {
      const result = await db.query(
        'SELECT email, added_by, added_at FROM whitelist ORDER BY added_at DESC LIMIT 1000'
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching whitelist:', error);
      return [];
    }
  }

  // Public method to verify JWT tokens
  verifyJWT(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  private async initializeWhitelist(): Promise<void> {
    // Prevent multiple simultaneous loads
    if (this.whitelistLoadPromise) {
      return this.whitelistLoadPromise;
    }

    this.whitelistLoadPromise = this.loadWhitelist();
    await this.whitelistLoadPromise;
    this.whitelistLoadPromise = null;
  }

  private async ensureWhitelistLoaded(): Promise<void> {
    if (!this.whitelistLoaded) {
      await this.initializeWhitelist();
    }
  }

  private async loadWhitelist(): Promise<void> {
    try {
      // Skip database loading if db is not properly initialized
      if (!db || typeof db.query !== 'function') {
        console.log('Database not available, using empty whitelist');
        this.whitelistLoaded = true;
        return;
      }

      // Load in batches for large whitelists
      const result = await db.query(
        'SELECT email FROM whitelist WHERE active = true'
      );
      
      this.whitelist = new Set(
        result.rows.map(row => row.email.toLowerCase())
      );
      
      this.whitelistLoaded = true;
      console.log(`Loaded ${this.whitelist.size} whitelisted emails`);
    } catch (error) {
      console.error('Error loading whitelist:', error);
      this.whitelist = new Set();
      this.whitelistLoaded = true;
    }
  }

  private isWhitelisted(email: string): boolean {
    return this.whitelist.has(email.toLowerCase());
  }

  private getCachedUser(email: string): any | null {
    const cached = this.userCache.get(email);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.user;
    }
    // Remove expired cache
    if (cached) {
      this.userCache.delete(email);
    }
    return null;
  }

  private cacheUser(email: string, user: any): void {
    this.userCache.set(email, {
      user,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.userCache.size > 1000) {
      const firstKey = this.userCache.keys().next().value;
      this.userCache.delete(firstKey);
    }
  }

  private async findOrCreateUser(userData: UserData): Promise<any> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Use UPSERT for atomic operation
      const result = await client.query(
        `INSERT INTO users (email, name, picture, google_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (email) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           picture = EXCLUDED.picture,
           google_id = EXCLUDED.google_id,
           updated_at = NOW(),
           last_login = NOW()
         RETURNING *`,
        [userData.email, userData.name, userData.picture, userData.googleId]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating/updating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private generateJWT(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      this.JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: 'your-app-name',
        audience: 'your-app-users'
      }
    );
  }

  // Cleanup method for graceful shutdown
  async cleanup(): Promise<void> {
    this.userCache.clear();
    this.whitelist.clear();
  }
}
