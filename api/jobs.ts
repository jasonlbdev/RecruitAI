import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllJobs, getJobById, createJob } from '../lib/database';

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
      const jobs = await getAllJobs();
      
      // Apply client-side filters (simplified - proper filtering would be in SQL)
      let filteredJobs = [...jobs];
      
      if (req.query.search) {
        const searchTerm = (req.query.search as string).toLowerCase();
        filteredJobs = filteredJobs.filter(job =>
          job.title?.toLowerCase().includes(searchTerm) ||
          job.department?.toLowerCase().includes(searchTerm) ||
          job.location?.toLowerCase().includes(searchTerm) ||
          job.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (req.query.status && req.query.status !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.status === req.query.status);
      }
      
      if (req.query.department && req.query.department !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.department === req.query.department);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          data: filteredJobs,
          total: filteredJobs.length
        }
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch jobs. Please ensure database is connected.'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const jobData = {
        ...req.body,
        status: req.body.status || 'active',
        postedBy: req.body.postedBy || 'System Admin',
        applicants: 0
      };

      const newJob = await createJob(jobData);
      
      return res.status(201).json({
        success: true,
        data: newJob
      });
    } catch (error) {
      console.error('Error creating job:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create job. Please check your data and try again.'
      });
    }
  }

  // Handle individual job operations (GET, PUT, DELETE by ID)
  const urlParts = req.url?.split('/') || [];
  const jobId = urlParts[urlParts.length - 1];

  if (req.method === 'PUT' && jobId) {
    try {
      // For now, return a message about updating jobs
      return res.status(200).json({
        success: true,
        message: 'Job update functionality will be implemented with database migrations'
      });
    } catch (error) {
      console.error('Error updating job:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update job'
      });
    }
  }

  if (req.method === 'DELETE' && jobId) {
    try {
      // For now, return a message about deleting jobs
      return res.status(200).json({
        success: true,
        message: 'Job deletion functionality will be implemented with database migrations'
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete job'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 