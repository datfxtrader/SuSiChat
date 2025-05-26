
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    is_admin?: boolean;
  };
}

export const isAuthenticated = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // For now, we'll use a simple check - in a real app you'd validate JWT tokens
  // Check if user data exists in headers or session
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  
  if (!userId && !userEmail) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Add user info to request for downstream handlers
  req.user = {
    id: userId || 'anonymous',
    email: userEmail || 'anonymous@example.com'
  };

  next();
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
