import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';

// Function to update AI prompts based on new job
function updateAIPromptsForJob(db: any, jobData: any) {
  try {
    // Get current resume analysis prompt
    const resumePromptSetting = db.system_settings?.find((s: any) => s.key === 'resume_analysis_prompt');
    
    if (resumePromptSetting) {
      // Create job-specific context to add to prompts
      const jobContext = `

**CURRENT JOB FOCUS:**
Position: ${jobData.title}
Department: ${jobData.department}
Location: ${jobData.location}
Description: ${jobData.description}
Requirements: ${Array.isArray(jobData.requirements) ? jobData.requirements.join(', ') : 'See job description'}
Experience Level: ${jobData.experienceLevel || 'Not specified'}
Salary Range: $${jobData.salaryMin?.toLocaleString() || 'Not specified'} - $${jobData.salaryMax?.toLocaleString() || 'Not specified'}

When analyzing resumes, prioritize candidates who match these specific job requirements.`;

      // Check if job context already exists and update it
      let updatedPrompt = resumePromptSetting.value;
      
      // Remove old job context if it exists
      updatedPrompt = updatedPrompt.replace(/\*\*CURRENT JOB FOCUS:\*\*[\s\S]*?When analyzing resumes, prioritize candidates who match these specific job requirements\./g, '');
      
      // Add new job context
      updatedPrompt += jobContext;
      
      // Update the prompt setting
      resumePromptSetting.value = updatedPrompt;
      resumePromptSetting.updatedAt = new Date().toISOString();
      
      console.log(`Updated AI prompts for new job: ${jobData.title}`);
    }
  } catch (error) {
    console.error('Failed to update AI prompts for job:', error);
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Add comprehensive error handling
  try {
    // Remove auth check - allow all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    console.log(`Jobs API called: ${req.method} ${req.url}`);

    if (req.method === 'GET') {
      try {
        const db = getMemoryDB();
        console.log('Database loaded successfully');
        
        const jobs = db.jobs || [];
        console.log(`Found ${jobs.length} jobs in database`);
        
        // Apply filters
        let filteredJobs = jobs;
        
        if (req.query.search) {
          const searchTerm = (req.query.search as string).toLowerCase();
          filteredJobs = filteredJobs.filter((job: any) =>
            job.title.toLowerCase().includes(searchTerm) ||
            job.department.toLowerCase().includes(searchTerm) ||
            job.location.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm)
          );
        }
        
        if (req.query.status && req.query.status !== 'all') {
          filteredJobs = filteredJobs.filter((job: any) => job.status === req.query.status);
        }
        
        if (req.query.department && req.query.department !== 'all') {
          filteredJobs = filteredJobs.filter((job: any) => job.department === req.query.department);
        }

        // Add application count for each job
        const jobsWithCounts = filteredJobs.map((job: any) => ({
          ...job,
          applications: db.applications?.filter((app: any) => app.jobId === job.id).length || 0,
          postedDate: job.createdAt,
          jobType: job.type || job.jobType,
          employmentType: job.employmentType || 'permanent',
          isRemote: job.location === 'Remote' || job.isRemote
        }));
        
        console.log(`Returning ${jobsWithCounts.length} filtered jobs`);
        
        return res.status(200).json({
          success: true,
          data: {
            data: jobsWithCounts,
            total: jobsWithCounts.length
          }
        });
      } catch (error) {
        console.error('Error in GET /api/jobs:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch jobs',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (req.method === 'POST') {
      try {
        console.log('Creating new job with data:', JSON.stringify(req.body, null, 2));
        
        const db = getMemoryDB();
        const newJob = {
          id: `job-${Date.now()}`,
          ...req.body,
          type: req.body.jobType || req.body.type,
          status: req.body.status || 'active',
          applications: 0,
          postedDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('New job object created:', JSON.stringify(newJob, null, 2));
        
        // Add to memory database
        if (!db.jobs) {
          db.jobs = [];
        }
        db.jobs.push(newJob);

        // Create audit log entry
        const auditEntry = {
          id: `audit-${Date.now()}`,
          entityType: 'job',
          entityId: newJob.id,
          action: 'created',
          changes: newJob,
          oldValues: null,
          timestamp: new Date().toISOString(),
          userId: 'admin-user-id' // In production, get from auth
        };

        // Initialize audit log if not exists
        if (!db.audit_log) {
          db.audit_log = [];
        }
        db.audit_log.push(auditEntry);
        
        // Auto-update AI prompts with new job requirements
        try {
          updateAIPromptsForJob(db, newJob);
        } catch (error) {
          console.error('Failed to update AI prompts:', error);
          // Don't fail job creation if prompt update fails
        }
        
        console.log(`Job created successfully with ID: ${newJob.id}`);
        
        return res.status(201).json({
          success: true,
          data: newJob,
          message: 'Job created and AI prompts updated for better candidate matching'
        });
      } catch (error) {
        console.error('Error in POST /api/jobs:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create job',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Extract job ID from URL path for PUT and DELETE
    const urlParts = req.url?.split('/') || [];
    const jobId = urlParts[urlParts.length - 1];

    if (req.method === 'PUT') {
      try {
        const db = getMemoryDB();
        const jobIndex = db.jobs.findIndex((job: any) => job.id === jobId);
        
        if (jobIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Job not found'
          });
        }
        
        // Create audit log entry
        const auditEntry = {
          id: `audit-${Date.now()}`,
          entityType: 'job',
          entityId: jobId,
          action: 'updated',
          changes: req.body,
          oldValues: db.jobs[jobIndex],
          timestamp: new Date().toISOString(),
          userId: 'admin-user-id' // In production, get from auth
        };

        // Initialize audit log if not exists
        if (!db.audit_log) {
          db.audit_log = [];
        }
        db.audit_log.push(auditEntry);

        // Update job
        const updatedJob = {
          ...db.jobs[jobIndex],
          ...req.body,
          updatedAt: new Date().toISOString()
        };
        
        db.jobs[jobIndex] = updatedJob;
        
        return res.status(200).json({
          success: true,
          data: updatedJob
        });
      } catch (error) {
        console.error('Error in PUT /api/jobs:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update job'
        });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const db = getMemoryDB();
        const jobIndex = db.jobs.findIndex((job: any) => job.id === jobId);
        
        if (jobIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Job not found'
          });
        }
        
        // Create audit log entry
        const auditEntry = {
          id: `audit-${Date.now()}`,
          entityType: 'job',
          entityId: jobId,
          action: 'deleted',
          changes: null,
          oldValues: db.jobs[jobIndex],
          timestamp: new Date().toISOString(),
          userId: 'admin-user-id' // In production, get from auth
        };

        // Initialize audit log if not exists
        if (!db.audit_log) {
          db.audit_log = [];
        }
        db.audit_log.push(auditEntry);

        // Remove job
        const deletedJob = db.jobs.splice(jobIndex, 1)[0];
        
        // Also remove related applications
        if (db.applications) {
          db.applications = db.applications.filter((app: any) => app.jobId !== jobId);
        }
        
        return res.status(200).json({
          success: true,
          data: deletedJob,
          message: 'Job and related applications deleted successfully'
        });
      } catch (error) {
        console.error('Error in DELETE /api/jobs:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete job'
        });
      }
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('Critical error in jobs API handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 