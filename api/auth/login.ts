import { VercelRequest, VercelResponse } from '@vercel/node';
import bcryptjs from 'bcryptjs';
import { initDatabase } from '../../server/database';
import { generateTokens } from '../../server/middleware/auth';
import { LoginRequest, LoginResponse, ApiResponse, User } from '../../shared/api';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    const db = await initDatabase();
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
} 