
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';

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

export class GoogleAuthService {
  private client: OAuth2Client;
  private whitelist: Set<string>;

  constructor() {
    this.client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    
    this.loadWhitelist();
  }

  async verifyAndAuthorize(idToken: string): Promise<AuthResult> {
    try {
      // Verify Google token
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      const email = payload?.email;
      
      if (!email) {
        throw new Error('No email in token');
      }
      
      // Check whitelist
      if (!this.whitelist.has(email.toLowerCase())) {
        return {
          authorized: false,
          reason: 'Email not in whitelist'
        };
      }
      
      // Create or update user
      const user = await this.findOrCreateUser({
        email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub
      });
      
      return {
        authorized: true,
        user,
        token: await this.generateSessionToken(user.id)
      };
    } catch (error) {
      console.error('Auth error:', error);
      return {
        authorized: false,
        reason: 'Authentication failed'
      };
    }
  }

  async addToWhitelist(email: string, addedBy: string): Promise<void> {
    try {
      await db.query('INSERT INTO whitelist (email, added_by) VALUES ($1, $2)', [
        email.toLowerCase(),
        addedBy
      ]);
      
      this.whitelist.add(email.toLowerCase());
    } catch (error) {
      console.error('Error adding to whitelist:', error);
      throw error;
    }
  }

  async removeFromWhitelist(email: string): Promise<void> {
    try {
      await db.query('DELETE FROM whitelist WHERE email = $1', [email.toLowerCase()]);
      this.whitelist.delete(email.toLowerCase());
    } catch (error) {
      console.error('Error removing from whitelist:', error);
      throw error;
    }
  }

  async getWhitelist(): Promise<any[]> {
    try {
      const result = await db.query('SELECT * FROM whitelist ORDER BY added_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error fetching whitelist:', error);
      return [];
    }
  }

  private async loadWhitelist(): Promise<void> {
    try {
      const result = await db.query('SELECT email FROM whitelist');
      this.whitelist = new Set(result.rows.map(row => row.email.toLowerCase()));
    } catch (error) {
      console.error('Error loading whitelist:', error);
      this.whitelist = new Set();
    }
  }

  private async findOrCreateUser(userData: UserData): Promise<any> {
    try {
      // Check if user exists
      let result = await db.query('SELECT * FROM users WHERE email = $1', [userData.email]);
      
      if (result.rows.length > 0) {
        // Update existing user
        result = await db.query(
          'UPDATE users SET name = $1, picture = $2, google_id = $3, updated_at = NOW() WHERE email = $4 RETURNING *',
          [userData.name, userData.picture, userData.googleId, userData.email]
        );
      } else {
        // Create new user
        result = await db.query(
          'INSERT INTO users (email, name, picture, google_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
          [userData.email, userData.name, userData.picture, userData.googleId]
        );
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  private async generateSessionToken(userId: string): Promise<string> {
    // Generate a session token - you can use JWT or similar
    const token = `session_${userId}_${Date.now()}`;
    
    try {
      await db.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
      );
      
      return token;
    } catch (error) {
      console.error('Error generating session token:', error);
      throw error;
    }
  }
}
