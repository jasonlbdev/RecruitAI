import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // Test database connection
      const result = await sql`SELECT 1 as test`;
      
      return res.status(200).json({
        success: true,
        message: 'Database connection successful',
        data: {
          test: result[0]?.test,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  if (req.method === 'POST') {
    try {
      // Create basic tables
      await sql`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT)`;
      
      return res.status(200).json({
        success: true,
        message: 'Test table created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Table creation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Table creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 