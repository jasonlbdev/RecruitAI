import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Remove auth check - return demo user
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const demoUser = {
      id: 'user-demo',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@recruitai.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: demoUser
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 