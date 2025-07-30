-- RecruitAI Database Schema for Neon Postgres
-- Run this SQL in your Neon dashboard to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(100),
  location VARCHAR(255),
  type VARCHAR(50) DEFAULT 'full-time',
  salary_min INTEGER,
  salary_max INTEGER,
  experience_level VARCHAR(50),
  skills JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]',
  benefits JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active',
  deadline DATE,
  scoring_weights JSONB DEFAULT '{"experience": 30, "skills": 30, "location": 15, "education": 15, "salary": 10}',
  is_remote BOOLEAN DEFAULT false,
  posted_by VARCHAR(255),
  applicants INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  location VARCHAR(255),
  current_position VARCHAR(255),
  current_company VARCHAR(255),
  years_experience INTEGER DEFAULT 0,
  skills JSONB DEFAULT '[]',
  skills_detailed JSONB DEFAULT '{}',
  summary TEXT,
  education JSONB DEFAULT '{}',
  work_experience JSONB DEFAULT '[]',
  resume_blob_url VARCHAR(500),
  resume_text TEXT,
  source VARCHAR(100) DEFAULT 'manual',
  ai_score INTEGER DEFAULT 0,
  ai_analysis TEXT,
  ai_analysis_summary TEXT,
  ai_recommendation VARCHAR(50),
  ai_scores JSONB DEFAULT '{}',
  key_strengths JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  bias_detection JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  is_remote_ok BOOLEAN DEFAULT false,
  desired_salary_min INTEGER,
  desired_salary_max INTEGER,
  linkedin_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table  
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'new',
  stage VARCHAR(100) DEFAULT 'Application Submitted',
  ai_score INTEGER DEFAULT 0,
  notes TEXT,
  applied_date DATE DEFAULT CURRENT_DATE,
  experience VARCHAR(255),
  resume_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'recruiter',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  is_public INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  action VARCHAR(50),
  changes JSONB,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'job', 'candidate', 'application', 'system'
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export'
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  changes JSONB, -- Store before/after values for updates
  metadata JSONB, -- Additional context like IP, user agent, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidate notes table
CREATE TABLE IF NOT EXISTS candidate_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  author VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES 
  ('grok_api_key', '', 'Grok by xAI API key for candidate analysis', 0),
  ('max_tokens', '1500', 'Maximum tokens for AI analysis', 1),
  ('temperature', '0.7', 'AI model temperature setting', 1),
  ('model', 'grok-beta', 'AI model to use for analysis', 1),
  ('system_prompt', 'You are an expert AI recruitment assistant specializing in candidate evaluation and resume analysis. Your goal is to help recruiters make informed, unbiased decisions by providing structured analysis of candidates based on their qualifications and job requirements. Always maintain professionalism and objectivity in your assessments.', 'System prompt for AI assistant', 0),
  ('resume_analysis_prompt', 'Analyze the following resume against the job requirements and provide a comprehensive evaluation:\n\n**CANDIDATE RESUME:**\n{resume_text}\n\n**JOB REQUIREMENTS:**\n{job_requirements}\n\n**JOB DESCRIPTION:**\n{job_description}\n\nPlease provide your analysis in the following structured format:\n\n**CANDIDATE SUMMARY:**\n- Name: [Extract from resume]\n- Current Position: [Current role and company]\n- Years of Experience: [Calculate from work history]\n- Education: [Highest degree and institution]\n- Location: [Current location]\n\n**TECHNICAL SKILLS ASSESSMENT:**\n- Required Skills Match: [List matching skills with proficiency indicators]\n- Additional Technical Skills: [Other relevant technical skills]\n- Skill Gaps: [Important skills from job requirements not evident in resume]\n- Overall Technical Fit: [Score 1-10 with explanation]\n\n**EXPERIENCE ANALYSIS:**\n- Relevant Experience: [How their experience aligns with the role]\n- Career Progression: [Analysis of career growth and trajectory]\n- Industry Background: [Relevant industry experience]\n- Leadership Experience: [Any management or leadership roles]\n\n**SCORING & EVALUATION:**\n- Overall Match Score: [0-100 with detailed breakdown]\n- Technical Competency: [1-10]\n- Experience Relevance: [1-10]\n- Cultural Potential: [1-10 based on available information]\n- Growth Potential: [1-10]\n\n**RECOMMENDATION:**\n- Hiring Decision: [STRONG_RECOMMEND / RECOMMEND / CONSIDER / NOT_RECOMMEND]\n- Key Strengths: [Top 3-5 strengths for this specific role]\n- Areas of Concern: [Any potential issues or gaps]\n- Interview Focus Areas: [Specific topics to explore in interviews]\n- Salary Range Fit: [How they align with role expectations]\n\n**POTENTIAL RED FLAGS:**\n[Any concerning gaps, inconsistencies, or issues that require clarification]\n\n**NEXT STEPS:**\n[Specific recommendations for next steps in the hiring process]', 'Comprehensive resume analysis prompt', 0),
  ('skills_extraction_prompt', 'Extract and categorize all skills mentioned in the following resume text. Be thorough and include both explicitly stated skills and those that can be reasonably inferred from job descriptions and achievements.\n\n**RESUME TEXT:**\n{resume_text}\n\nPlease organize the extracted skills into the following categories:\n\n**TECHNICAL SKILLS:**\n- Programming Languages: [List all languages with any indicated proficiency levels]\n- Frameworks & Libraries: [Web frameworks, ML libraries, etc.]\n- Databases & Storage: [SQL, NoSQL, cloud storage solutions]\n- Cloud & DevOps: [AWS, Azure, GCP, Docker, Kubernetes, CI/CD tools]\n- Development Tools: [IDEs, version control, project management tools]\n- Operating Systems: [Windows, Linux, macOS]\n- Other Technical: [Any other technical skills not covered above]\n\n**SOFT SKILLS:**\n- Leadership & Management: [Team leadership, project management, mentoring]\n- Communication: [Presentation, writing, stakeholder management]\n- Problem Solving: [Analytical thinking, troubleshooting, innovation]\n- Collaboration: [Teamwork, cross-functional collaboration]\n- Adaptability: [Learning agility, change management]\n- Other Interpersonal: [Other soft skills demonstrated]\n\n**DOMAIN EXPERTISE:**\n- Industry Knowledge: [Specific industry experience and knowledge]\n- Business Skills: [Strategy, operations, business development]\n- Analytical Skills: [Data analysis, research, metrics]\n- Design Skills: [UI/UX, graphic design, user research]\n\n**CERTIFICATIONS & CREDENTIALS:**\n- Professional Certifications: [AWS, Google, Microsoft, etc.]\n- Academic Credentials: [Degrees, relevant coursework]\n- Training & Courses: [Online courses, bootcamps, workshops]\n\n**YEARS OF EXPERIENCE:**\nFor each major skill category, estimate years of experience based on job history and descriptions.\n\nProvide confidence levels (High/Medium/Low) for each skill based on how clearly it''s demonstrated in the resume.', 'Detailed skills extraction prompt', 0),
  ('response_format', 'Always respond with valid JSON in the following structure:\n\n{\n  "candidateSummary": {\n    "name": "string",\n    "currentPosition": "string",\n    "yearsOfExperience": number,\n    "education": "string",\n    "location": "string"\n  },\n  "technicalSkills": {\n    "requiredSkillsMatch": ["string"],\n    "additionalSkills": ["string"],\n    "skillGaps": ["string"],\n    "technicalFitScore": number\n  },\n  "experienceAnalysis": {\n    "relevantExperience": "string",\n    "careerProgression": "string",\n    "industryBackground": "string",\n    "leadershipExperience": "string"\n  },\n  "scoring": {\n    "overallMatchScore": number,\n    "technicalCompetency": number,\n    "experienceRelevance": number,\n    "culturalPotential": number,\n    "growthPotential": number\n  },\n  "recommendation": {\n    "hiringDecision": "STRONG_RECOMMEND|RECOMMEND|CONSIDER|NOT_RECOMMEND",\n    "keyStrengths": ["string"],\n    "areasOfConcern": ["string"],\n    "interviewFocusAreas": ["string"],\n    "salaryRangeFit": "string"\n  },\n  "redFlags": ["string"],\n  "nextSteps": ["string"]\n}\n\nEnsure all fields are properly filled and the JSON is valid.', 'Expected JSON response format', 0)
ON CONFLICT (key) DO NOTHING; 

-- Add AI provider selection settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('ai_provider', 'openai', 'Selected AI provider (openai or xai)', 1),
  ('openai_api_key', '', 'OpenAI API key for GPT models', 0),
  ('openai_model', 'gpt-4o', 'OpenAI model to use', 1),
  ('xai_api_key', '', 'xAI API key for Grok models', 0),
  ('xai_model', 'grok-3-mini', 'xAI model to use', 1)
ON CONFLICT (key) DO NOTHING; 