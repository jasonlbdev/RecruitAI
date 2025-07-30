import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAllJobs, 
  getAllCandidates, 
  getAllApplications, 
  getSystemSettings,
  getDashboardMetrics 
} from '../lib/database';

// REMOVED: All 640 lines of mock data 
// NOW: Database-backed functions only

export async function getMemoryDB() {
  try {
    const [jobs, candidates, applications, systemSettings] = await Promise.all([
      getAllJobs(),
      getAllCandidates(), 
      getAllApplications(),
      getSystemSettings()
    ]);

    // Convert system settings array to object format for backward compatibility
    const settings = systemSettings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return {
      jobs: jobs || [],
      candidates: candidates || [],
      applications: applications || [],
      system_settings: systemSettings || [],
      // Legacy format for existing code
      settings
    };
  } catch (error) {
    console.error('Database connection error:', error);
    // Fallback to empty structure if database is not available
    return {
      jobs: [],
      candidates: [],
      applications: [],
      system_settings: [],
      settings: {}
    };
  }
}

// Database initialization endpoint
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
      const data = await getMemoryDB();
      const metrics = await getDashboardMetrics();
      
      return res.status(200).json({
        success: true,
        message: 'Database connected successfully',
        data: {
          ...data,
          metrics
        }
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        message: 'Please ensure DATABASE_URL environment variable is set correctly'
      });
    }
  }

  if (req.method === 'POST') {
    // Database reset/initialization (for development only)
    if (req.body?.action === 'reset') {
      return res.status(200).json({
        success: true,
        message: 'Database reset is handled by running the schema.sql file directly in Neon dashboard'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

// Legacy export for backward compatibility
export function resetMemoryDB() {
  console.warn('resetMemoryDB is deprecated - use database migrations instead');
  return Promise.resolve();
} 