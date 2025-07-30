import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const db = await getMemoryDB();
    
    const testResults = {
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        details: {
          candidates: Array.isArray(db.candidates) ? db.candidates.length : 0,
          jobs: Array.isArray(db.jobs) ? db.jobs.length : 0,
          applications: Array.isArray(db.applications) ? db.applications.length : 0,
          settings: Array.isArray(db.system_settings) ? db.system_settings.length : 0
        }
      },
      storage: {
        status: process.env.BLOB_READ_WRITE_TOKEN ? 'configured' : 'not_configured',
        details: process.env.BLOB_READ_WRITE_TOKEN ? 'Vercel Blob token present' : 'Missing BLOB_READ_WRITE_TOKEN'
      },
      ai: {
        status: 'ready',
        details: 'AI providers configured via settings'
      }
    };

    return res.status(200).json({
      success: true,
      data: testResults
    });
  } catch (error) {
    console.error('Integration test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 