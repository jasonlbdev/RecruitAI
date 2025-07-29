import { RequestHandler } from "express";
import { randomUUID } from 'crypto';
import { getDatabase } from '../database';
import { AuthenticatedRequest } from '../middleware/auth';
import { Job, CreateJobRequest, ApiResponse, PaginatedResponse, SearchFilters, JobAICriteria } from '@shared/api';

export const getJobs: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      search, 
      status, 
      department, 
      location, 
      jobType, 
      experienceLevel, 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    }: SearchFilters = req.query;

    const db = getDatabase();
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (j.title LIKE ? OR j.description LIKE ? OR j.department LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereClause += ' AND j.status = ?';
      params.push(status);
    }

    if (department) {
      whereClause += ' AND j.department = ?';
      params.push(department);
    }

    if (location) {
      whereClause += ' AND j.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (jobType) {
      whereClause += ' AND j.job_type = ?';
      params.push(jobType);
    }

    if (experienceLevel) {
      whereClause += ' AND j.experience_level = ?';
      params.push(experienceLevel);
    }

    const validSortColumns = ['title', 'department', 'posted_date', 'created_at', 'status'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const offset = (Number(page) - 1) * Number(limit);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM jobs j
      ${whereClause}
    `;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    // Get jobs with application counts
    const jobsQuery = `
      SELECT 
        j.*,
        u1.first_name || ' ' || u1.last_name as created_by_name,
        u2.first_name || ' ' || u2.last_name as hiring_manager_name,
        COUNT(a.id) as applications_count,
        COUNT(CASE WHEN ai.overall_score >= 70 THEN 1 END) as qualified_count
      FROM jobs j
      LEFT JOIN users u1 ON j.created_by = u1.id
      LEFT JOIN users u2 ON j.hiring_manager = u2.id
      LEFT JOIN applications a ON j.id = a.job_id
      LEFT JOIN ai_scores ai ON a.id = ai.application_id
      ${whereClause}
      GROUP BY j.id
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    const jobs = await db.all(jobsQuery, [...params, Number(limit), offset]);

    const jobsResponse: Job[] = jobs.map(job => ({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      jobType: job.job_type,
      employmentType: job.employment_type,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      description: job.description,
      requirements: JSON.parse(job.requirements || '[]'),
      niceToHave: job.nice_to_have ? JSON.parse(job.nice_to_have) : undefined,
      postedDate: new Date(job.posted_date),
      deadline: job.deadline ? new Date(job.deadline) : undefined,
      status: job.status,
      createdBy: job.created_by,
      hiringManager: job.hiring_manager,
      isRemote: Boolean(job.is_remote),
      experienceLevel: job.experience_level,
      applications: job.applications_count || 0,
      qualified: job.qualified_count || 0,
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at)
    }));

    const response: ApiResponse<PaginatedResponse<Job>> = {
      success: true,
      data: {
        data: jobsResponse,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const getJob: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const job = await db.get(`
      SELECT 
        j.*,
        u1.first_name || ' ' || u1.last_name as created_by_name,
        u2.first_name || ' ' || u2.last_name as hiring_manager_name,
        COUNT(a.id) as applications_count,
        COUNT(CASE WHEN ai.overall_score >= 70 THEN 1 END) as qualified_count
      FROM jobs j
      LEFT JOIN users u1 ON j.created_by = u1.id
      LEFT JOIN users u2 ON j.hiring_manager = u2.id
      LEFT JOIN applications a ON j.id = a.job_id
      LEFT JOIN ai_scores ai ON a.id = ai.application_id
      WHERE j.id = ?
      GROUP BY j.id
    `, [id]);

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    // Get AI criteria if exists
    const aiCriteria = await db.get(`
      SELECT * FROM job_ai_criteria WHERE job_id = ?
    `, [id]);

    const jobResponse: Job = {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      jobType: job.job_type,
      employmentType: job.employment_type,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      description: job.description,
      requirements: JSON.parse(job.requirements || '[]'),
      niceToHave: job.nice_to_have ? JSON.parse(job.nice_to_have) : undefined,
      postedDate: new Date(job.posted_date),
      deadline: job.deadline ? new Date(job.deadline) : undefined,
      status: job.status,
      createdBy: job.created_by,
      hiringManager: job.hiring_manager,
      isRemote: Boolean(job.is_remote),
      experienceLevel: job.experience_level,
      applications: job.applications_count || 0,
      qualified: job.qualified_count || 0,
      aiCriteria: aiCriteria ? {
        id: aiCriteria.id,
        jobId: aiCriteria.job_id,
        skillsWeight: aiCriteria.skills_weight,
        experienceWeight: aiCriteria.experience_weight,
        educationWeight: aiCriteria.education_weight,
        locationWeight: aiCriteria.location_weight,
        requiredSkills: JSON.parse(aiCriteria.required_skills || '[]'),
        preferredSkills: aiCriteria.preferred_skills ? JSON.parse(aiCriteria.preferred_skills) : undefined,
        minimumExperience: aiCriteria.minimum_experience,
        educationRequirements: aiCriteria.education_requirements ? JSON.parse(aiCriteria.education_requirements) : undefined,
        autoRejectThreshold: aiCriteria.auto_reject_threshold,
        autoApproveThreshold: aiCriteria.auto_approve_threshold
      } : undefined,
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at)
    };

    res.json({
      success: true,
      data: jobResponse
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const createJob: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const jobData: CreateJobRequest = req.body;
    
    if (!jobData.title || !jobData.department || !jobData.description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, department, and description are required' 
      });
    }

    const db = getDatabase();
    const jobId = randomUUID();

    await db.run(`
      INSERT INTO jobs (
        id, title, department, location, job_type, employment_type,
        salary_min, salary_max, description, requirements, nice_to_have,
        deadline, created_by, hiring_manager, is_remote, experience_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      jobId,
      jobData.title,
      jobData.department,
      jobData.location || null,
      jobData.jobType,
      jobData.employmentType,
      jobData.salaryMin || null,
      jobData.salaryMax || null,
      jobData.description,
      JSON.stringify(jobData.requirements),
      jobData.niceToHave ? JSON.stringify(jobData.niceToHave) : null,
      jobData.deadline ? jobData.deadline.toISOString().split('T')[0] : null,
      req.user!.id,
      null, // hiring_manager can be set later
      jobData.isRemote ? 1 : 0,
      jobData.experienceLevel
    ]);

    // Create AI criteria if provided
    if (jobData.aiCriteria) {
      const criteriaId = randomUUID();
      await db.run(`
        INSERT INTO job_ai_criteria (
          id, job_id, skills_weight, experience_weight, education_weight, location_weight,
          required_skills, preferred_skills, minimum_experience, education_requirements,
          auto_reject_threshold, auto_approve_threshold
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        criteriaId,
        jobId,
        jobData.aiCriteria.skillsWeight,
        jobData.aiCriteria.experienceWeight,
        jobData.aiCriteria.educationWeight,
        jobData.aiCriteria.locationWeight,
        JSON.stringify(jobData.aiCriteria.requiredSkills),
        jobData.aiCriteria.preferredSkills ? JSON.stringify(jobData.aiCriteria.preferredSkills) : null,
        jobData.aiCriteria.minimumExperience,
        jobData.aiCriteria.educationRequirements ? JSON.stringify(jobData.aiCriteria.educationRequirements) : null,
        jobData.aiCriteria.autoRejectThreshold,
        jobData.aiCriteria.autoApproveThreshold
      ]);
    }

    // Fetch the created job
    const createdJob = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    
    const jobResponse: Job = {
      id: createdJob.id,
      title: createdJob.title,
      department: createdJob.department,
      location: createdJob.location,
      jobType: createdJob.job_type,
      employmentType: createdJob.employment_type,
      salaryMin: createdJob.salary_min,
      salaryMax: createdJob.salary_max,
      description: createdJob.description,
      requirements: JSON.parse(createdJob.requirements || '[]'),
      niceToHave: createdJob.nice_to_have ? JSON.parse(createdJob.nice_to_have) : undefined,
      postedDate: new Date(createdJob.posted_date),
      deadline: createdJob.deadline ? new Date(createdJob.deadline) : undefined,
      status: createdJob.status,
      createdBy: createdJob.created_by,
      hiringManager: createdJob.hiring_manager,
      isRemote: Boolean(createdJob.is_remote),
      experienceLevel: createdJob.experience_level,
      applications: 0,
      qualified: 0,
      createdAt: new Date(createdJob.created_at),
      updatedAt: new Date(createdJob.updated_at)
    };

    res.status(201).json({
      success: true,
      data: jobResponse
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const updateJob: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const db = getDatabase();
    
    // Check if job exists
    const existingJob = await db.get('SELECT * FROM jobs WHERE id = ?', [id]);
    if (!existingJob) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      'title', 'department', 'location', 'job_type', 'employment_type',
      'salary_min', 'salary_max', 'description', 'requirements', 'nice_to_have',
      'deadline', 'status', 'hiring_manager', 'is_remote', 'experience_level'
    ];

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        
        if (key === 'requirements' || key === 'niceToHave') {
          updateValues.push(Array.isArray(value) ? JSON.stringify(value) : value);
        } else if (key === 'isRemote') {
          updateValues.push(value ? 1 : 0);
        } else if (key === 'deadline' && value) {
          updateValues.push(new Date(value as string).toISOString().split('T')[0]);
        } else {
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid fields to update' 
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await db.run(`
      UPDATE jobs 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Get updated job
    const updatedJob = await db.get('SELECT * FROM jobs WHERE id = ?', [id]);
    
    const jobResponse: Job = {
      id: updatedJob.id,
      title: updatedJob.title,
      department: updatedJob.department,
      location: updatedJob.location,
      jobType: updatedJob.job_type,
      employmentType: updatedJob.employment_type,
      salaryMin: updatedJob.salary_min,
      salaryMax: updatedJob.salary_max,
      description: updatedJob.description,
      requirements: JSON.parse(updatedJob.requirements || '[]'),
      niceToHave: updatedJob.nice_to_have ? JSON.parse(updatedJob.nice_to_have) : undefined,
      postedDate: new Date(updatedJob.posted_date),
      deadline: updatedJob.deadline ? new Date(updatedJob.deadline) : undefined,
      status: updatedJob.status,
      createdBy: updatedJob.created_by,
      hiringManager: updatedJob.hiring_manager,
      isRemote: Boolean(updatedJob.is_remote),
      experienceLevel: updatedJob.experience_level,
      createdAt: new Date(updatedJob.created_at),
      updatedAt: new Date(updatedJob.updated_at)
    };

    res.json({
      success: true,
      data: jobResponse
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const deleteJob: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if job exists
    const existingJob = await db.get('SELECT id FROM jobs WHERE id = ?', [id]);
    if (!existingJob) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    // Check if job has applications
    const applicationCount = await db.get('SELECT COUNT(*) as count FROM applications WHERE job_id = ?', [id]);
    if (applicationCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete job with existing applications' 
      });
    }

    await db.run('DELETE FROM jobs WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}; 