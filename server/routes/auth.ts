import { RequestHandler } from "express";
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database';
import { generateTokens, AuthenticatedRequest } from '../middleware/auth';
import { LoginRequest, LoginResponse, RegisterRequest, ApiResponse, User } from '@shared/api';

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    const db = getDatabase();
    const user = await db.get(`
      SELECT id, email, password_hash, first_name, last_name, role, department, 
             is_active, last_login, created_at, updated_at
      FROM users 
      WHERE email = ? AND is_active = 1
    `, [email.toLowerCase()]);

    if (!user || !await bcryptjs.compare(password, user.password_hash)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Update last login
    await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    await db.run(`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `, [user.id, refreshToken]);

    const userResponse: User = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      isActive: Boolean(user.is_active),
      lastLogin: new Date(),
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at)
    };

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        user: userResponse,
        token: accessToken,
        refreshToken: refreshToken
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const register: RequestHandler = async (req, res) => {
  try {
    const { email, password, firstName, lastName, department }: RegisterRequest = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, first name, and last name are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      });
    }

    const db = getDatabase();
    
    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = randomUUID();

    // Create user
    await db.run(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, department, role)
      VALUES (?, ?, ?, ?, ?, ?, 'recruiter')
    `, [userId, email.toLowerCase(), hashedPassword, firstName, lastName, department || null]);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId);

    // Store refresh token
    await db.run(`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `, [userId, refreshToken]);

    const userResponse: User = {
      id: userId,
      email: email.toLowerCase(),
      firstName,
      lastName,
      role: 'recruiter',
      department: department || undefined,
      isActive: true,
      lastLogin: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        user: userResponse,
        token: accessToken,
        refreshToken: refreshToken
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const logout: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token && req.user) {
      const db = getDatabase();
      // Remove all refresh tokens for this user (logout from all devices)
      await db.run('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id]);
    }

    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const refreshToken: RequestHandler = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token is required' 
      });
    }

    const db = getDatabase();
    
    // Verify refresh token exists and is not expired
    const session = await db.get(`
      SELECT user_id FROM user_sessions 
      WHERE refresh_token = ? AND expires_at > datetime('now')
    `, [token]);

    if (!session) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired refresh token' 
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(session.user_id);

    // Replace old refresh token with new one
    await db.run(`
      UPDATE user_sessions 
      SET refresh_token = ?, expires_at = datetime('now', '+7 days')
      WHERE refresh_token = ?
    `, [newRefreshToken, token]);

    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const getMe: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}; 