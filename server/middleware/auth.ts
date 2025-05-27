
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

export const isAuthenticated = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated via Replit Auth session
  if (!req.user || !req.user.claims) {
    return res.status(401).json({ 
      message: "Authentication required" 
    });
  }
  
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.claims?.email || req.user.claims.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};
