import { RequestHandler } from "express";
import { getDatabase } from '../database';
import { AuthenticatedRequest } from '../middleware/auth';
import { DashboardMetrics, ApiResponse, Job, Application } from '@shared/api';

export const getDashboardMetrics: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDatabase();

    // Get total jobs count
    const totalJobsResult = await db.get('SELECT COUNT(*) as count FROM jobs');
    const totalJobs = totalJobsResult.count;

    // Get active jobs count
    const activeJobsResult = await db.get('SELECT COUNT(*) as count FROM jobs WHERE status = "active"');
    const activeJobs = activeJobsResult.count;

    // Get total applications count
    const totalApplicationsResult = await db.get('SELECT COUNT(*) as count FROM applications');
    const totalApplications = totalApplicationsResult.count;

    // Get new applications today count
    const newApplicationsTodayResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM applications 
      WHERE DATE(applied_date) = DATE('now')
    `);
    const newApplicationsToday = newApplicationsTodayResult.count;

    // Get total candidates count
    const totalCandidatesResult = await db.get('SELECT COUNT(*) as count FROM candidates');
    const totalCandidates = totalCandidatesResult.count;

    // Get applications by status
    const applicationsByStatusResult = await db.all(`
      SELECT status, COUNT(*) as count 
      FROM applications 
      GROUP BY status
    `);
    const applicationsByStatus: Record<string, number> = {};
    applicationsByStatusResult.forEach(row => {
      applicationsByStatus[row.status] = row.count;
    });

    // Get recent applications (last 10)
    const recentApplicationsData = await db.all(`
      SELECT 
        a.*,
        c.first_name || ' ' || c.last_name as candidate_name,
        c.email as candidate_email,
        j.title as job_title,
        j.department as job_department
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      ORDER BY a.applied_date DESC
      LIMIT 10
    `);

    const recentApplications: Application[] = recentApplicationsData.map(app => ({
      id: app.id,
      jobId: app.job_id,
      candidateId: app.candidate_id,
      status: app.status,
      currentStageId: app.current_stage_id,
      source: app.source,
      appliedDate: new Date(app.applied_date),
      coverLetter: app.cover_letter,
      salaryExpectation: app.salary_expectation,
      availability: app.availability,
      notes: app.notes,
      withdrawnAt: app.withdrawn_at ? new Date(app.withdrawn_at) : undefined,
      withdrawalReason: app.withdrawal_reason,
      candidate: {
        id: app.candidate_id,
        email: app.candidate_email,
        firstName: app.candidate_name.split(' ')[0],
        lastName: app.candidate_name.split(' ').slice(1).join(' '),
        phone: undefined,
        location: undefined,
        source: 'other',
        isBlacklisted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      job: {
        id: app.job_id,
        title: app.job_title,
        department: app.job_department,
        location: '',
        jobType: 'full-time',
        employmentType: 'permanent',
        description: '',
        requirements: [],
        postedDate: new Date(),
        status: 'active',
        createdBy: '',
        isRemote: false,
        experienceLevel: 'mid',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      createdAt: new Date(app.created_at),
      updatedAt: new Date(app.updated_at)
    }));

    // Get top performing jobs (by application count)
    const topPerformingJobsData = await db.all(`
      SELECT 
        j.*,
        COUNT(a.id) as applications_count,
        COUNT(CASE WHEN ai.overall_score >= 70 THEN 1 END) as qualified_count
      FROM jobs j
      LEFT JOIN applications a ON j.id = a.job_id
      LEFT JOIN ai_scores ai ON a.id = ai.application_id
      WHERE j.status = 'active'
      GROUP BY j.id
      ORDER BY applications_count DESC
      LIMIT 5
    `);

    const topPerformingJobs: Job[] = topPerformingJobsData.map(job => ({
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

    // Get AI processing stats
    const aiStatsResult = await db.get(`
      SELECT 
        COUNT(*) as total_processed,
        AVG(overall_score) as average_score,
        AVG(processing_time_ms) as avg_processing_time
      FROM ai_scores
    `);

    const aiProcessingStats = {
      totalProcessed: aiStatsResult.total_processed || 0,
      averageScore: Math.round(aiStatsResult.average_score || 0),
      processingTime: Math.round(aiStatsResult.avg_processing_time || 0)
    };

    const metrics: DashboardMetrics = {
      totalJobs,
      activeJobs,
      totalApplications,
      newApplicationsToday,
      totalCandidates,
      applicationsByStatus,
      recentApplications,
      topPerformingJobs,
      aiProcessingStats
    };

    const response: ApiResponse<DashboardMetrics> = {
      success: true,
      data: metrics
    };

    res.json(response);
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}; 