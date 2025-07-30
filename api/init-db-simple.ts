import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAllJobs, 
  getAllCandidates, 
  getAllApplications, 
  getSystemSettings,
  getDashboardMetrics,
  initializeDatabase
} from '../lib/database-simple';

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
      const [jobs, candidates, applications, systemSettings, metrics] = await Promise.all([
        getAllJobs(),
        getAllCandidates(), 
        getAllApplications(),
        getSystemSettings(),
        getDashboardMetrics()
      ]);

      // Convert system settings array to object format for backward compatibility
      const settings = systemSettings.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        message: 'Database connected successfully',
        data: {
          jobs: jobs || [],
          candidates: candidates || [],
          applications: applications || [],
          system_settings: systemSettings || [],
          settings,
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
    // Database reset/initialization
    if (req.body?.action === 'reset') {
      try {
        const schemaCreated = await initializeDatabase();
        if (schemaCreated) {
          return res.status(200).json({
            success: true,
            message: 'Database schema created successfully'
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Failed to create database schema'
          });
        }
      } catch (error) {
        console.error('Database reset error:', error);
        return res.status(500).json({
          success: false,
          error: 'Database reset failed'
        });
      }
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 