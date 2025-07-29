import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';

const mockJobs = [
  {
    id: 'job-001',
    title: 'Senior AI Engineer',
    description: 'Join our team to build AI-powered recruitment tools.',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'full-time',
    salaryMin: 150000,
    salaryMax: 200000,
    status: 'active',
    applicants: 12,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'job-002',
    title: 'Product Manager',
    description: 'Lead product strategy for recruitment platform.',
    department: 'Product',
    location: 'Remote',
    type: 'full-time',
    salaryMin: 120000,
    salaryMax: 160000,
    status: 'active',
    applicants: 8,
    createdAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 'job-003',
    title: 'UX Designer',
    description: 'Design intuitive user experiences.',
    department: 'Design',
    location: 'New York, NY',
    type: 'full-time',
    salaryMin: 90000,
    salaryMax: 130000,
    status: 'active',
    applicants: 15,
    createdAt: '2024-01-25T09:15:00Z'
  }
];

// Function to update AI prompts based on new job
function updateAIPromptsForJob(db: any, jobData: any) {
  try {
    // Get current resume analysis prompt
    const resumePromptSetting = db.system_settings.find((s: any) => s.key === 'resume_analysis_prompt');
    
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
  // Remove auth check - allow all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: {
        data: mockJobs,
        total: mockJobs.length
      }
    });
  }

  if (req.method === 'POST') {
    const newJob = {
      id: `job-${Date.now()}`,
      ...req.body,
      status: 'active',
      applicants: 0,
      createdAt: new Date().toISOString()
    };
    
    // Auto-update AI prompts with new job requirements
    try {
      const db = getMemoryDB();
      updateAIPromptsForJob(db, newJob);
    } catch (error) {
      console.error('Failed to update AI prompts:', error);
      // Don't fail job creation if prompt update fails
    }
    
    return res.status(201).json({
      success: true,
      data: newJob,
      message: 'Job created and AI prompts updated for better candidate matching'
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 