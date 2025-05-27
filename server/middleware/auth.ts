
import { Request, Response, NextFunction } from 'express';
import { GoogleAuthService } from '../auth/GoogleAuthService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    is_admin?: boolean;
  };
}

const googleAuth = new GoogleAuthService();

export const isAuthenticated = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - Bearer token missing'
      });
    }

    const token = authHeader.substring(7);
    const user = googleAuth.verifyJWT(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Add user info to request for downstream handlers
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.email === process.env.ADMIN_EMAIL // Set admin based on env var
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};
