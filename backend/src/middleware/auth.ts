import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const DEMO_USERS_MAP: Record<string, any> = {
  '507f1f77bcf86cd799439011': { _id: '507f1f77bcf86cd799439011', id: '507f1f77bcf86cd799439011', email: 'demo@interviewprepkit.com', name: 'Demo Candidate' },
  'user_demo_1': { _id: '507f1f77bcf86cd799439011', id: 'user_demo_1', email: 'demo@interviewprepkit.com', name: 'Demo Candidate' },
  '507f1f77bcf86cd799439012': { _id: '507f1f77bcf86cd799439012', id: '507f1f77bcf86cd799439012', email: 'alex@techcorp.com', name: 'Alex Chen' },
  'user_alex_2': { _id: '507f1f77bcf86cd799439012', id: 'user_alex_2', email: 'alex@techcorp.com', name: 'Alex Chen' },
  'user_demo_2': { _id: '507f1f77bcf86cd799439012', id: 'user_demo_2', email: 'alex@techcorp.com', name: 'Alex Chen' },
  '507f1f77bcf86cd799439013': { _id: '507f1f77bcf86cd799439013', id: '507f1f77bcf86cd799439013', email: 'sarah@startup.io', name: 'Sarah Johnson' },
  'user_sarah_3': { _id: '507f1f77bcf86cd799439013', id: 'user_sarah_3', email: 'sarah@startup.io', name: 'Sarah Johnson' },
  'user_demo_3': { _id: '507f1f77bcf86cd799439013', id: 'user_demo_3', email: 'sarah@startup.io', name: 'Sarah Johnson' }
};

export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const val = authHeader.substring(7).trim();
    if (val) return val;
  }
  const customHeader = req.headers['x-auth-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-production') as { userId?: string; email?: string; name?: string };
    const userId = decoded.userId || '';

    // Check demo users
    if (DEMO_USERS_MAP[userId]) {
      req.user = DEMO_USERS_MAP[userId];
      next();
      return;
    }

    // Try finding in database
    try {
      const user = await User.findById(userId).select('-passwordHash');
      if (user) {
        req.user = user;
        next();
        return;
      }
    } catch {
      // Database might be offline or format might differ
    }

    // If decoded token had email and name, fallback to decoded identity
    if (decoded.email) {
      req.user = {
        _id: userId,
        id: userId,
        email: decoded.email,
        name: decoded.name || 'User'
      };
      next();
      return;
    }

    res.status(401).json({ error: 'User not found' });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Session expired, please log in again' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-production') as { userId?: string; email?: string; name?: string };
      const userId = decoded.userId || '';
      if (DEMO_USERS_MAP[userId]) {
        req.user = DEMO_USERS_MAP[userId];
      } else {
        try {
          const user = await User.findById(userId).select('-passwordHash');
          if (user) req.user = user;
        } catch {
          if (decoded.email) {
            req.user = { _id: userId, id: userId, email: decoded.email, name: decoded.name || 'User' };
          }
        }
      }
    }
    next();
  } catch {
    next();
  }
};