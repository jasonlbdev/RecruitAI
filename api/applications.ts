import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllApplications, createApplication } from '../lib/database';

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
      const applications = await getAllApplications();
      
      // Apply filters
      let filteredApplications = [...applications];
      
      if (req.query.status && req.query.status !== 'all') {
        filteredApplications = filteredApplications.filter((app: any) => app.status === req.query.status);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          data: filteredApplications,
          total: filteredApplications.length
        }
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch applications. Please ensure database is connected.'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const applicationData = {
        jobId: req.body.jobId,
        candidateId: req.body.candidateId,
        status: req.body.status || 'new',
        stage: req.body.stage || 'Application Submitted',
        aiScore: req.body.aiScore || 0,
        notes: req.body.notes || '',
        appliedDate: req.body.appliedDate || new Date().toISOString().split('T')[0],
        experience: req.body.experience || '',
        resumeUrl: req.body.resumeUrl || ''
      };

      const newApplication = await createApplication(applicationData);
      
      return res.status(201).json({
        success: true,
        data: newApplication
      });
    } catch (error) {
      console.error('Error creating application:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create application. Please check your data and try again.'
      });
    }
  }

  // Handle individual application operations (GET, PUT, DELETE by ID)
  const urlParts = req.url?.split('/') || [];
  const applicationId = urlParts[urlParts.length - 1];

  if (req.method === 'PUT' && applicationId) {
    try {
      // For now, return a message about updating applications
      return res.status(200).json({
        success: true,
        message: 'Application update functionality will be implemented with database migrations'
      });
    } catch (error) {
      console.error('Error updating application:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update application'
      });
    }
  }

  if (req.method === 'DELETE' && applicationId) {
    try {
      // For now, return a message about deleting applications
      return res.status(200).json({
        success: true,
        message: 'Application deletion functionality will be implemented with database migrations'
      });
    } catch (error) {
      console.error('Error deleting application:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete application'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 