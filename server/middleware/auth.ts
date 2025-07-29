import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@shared/api';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }

    try {
      const db = getDatabase();
      const user = await db.get(`
        SELECT id, email, first_name, last_name, role, department, is_active, 
               last_login, created_at, updated_at
        FROM users 
        WHERE id = ? AND is_active = 1
      `, [decoded.userId]);

      if (!user) {
        return res.status(403).json({ success: false, error: 'User not found or inactive' });
      }

      // Convert database row to User interface
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        department: user.department,
        isActive: Boolean(user.is_active),
        lastLogin: user.last_login ? new Date(user.last_login) : undefined,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at)
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
}

export function requireRole(roles: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
}

export function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  
  return { accessToken, refreshToken };
} 