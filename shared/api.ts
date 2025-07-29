/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// ===== USER MANAGEMENT =====
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'hr_manager' | 'recruiter' | 'viewer';
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department?: string;
}

// ===== JOB MANAGEMENT =====
export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  employmentType: 'permanent' | 'temporary' | 'contract';
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  niceToHave?: string[];
  postedDate: Date;
  deadline?: Date;
  status: 'draft' | 'active' | 'paused' | 'closed' | 'cancelled';
  createdBy: string;
  hiringManager?: string;
  isRemote: boolean;
  experienceLevel: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  aiCriteria?: JobAICriteria;
  applications?: number;
  qualified?: number;
  aiScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobAICriteria {
  id: string;
  jobId: string;
  skillsWeight: number;
  experienceWeight: number;
  educationWeight: number;
  locationWeight: number;
  requiredSkills: string[];
  preferredSkills?: string[];
  minimumExperience: number;
  educationRequirements?: string[];
  autoRejectThreshold: number;
  autoApproveThreshold: number;
}

export interface CreateJobRequest {
  title: string;
  department: string;
  location: string;
  jobType: Job['jobType'];
  employmentType: Job['employmentType'];
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  niceToHave?: string[];
  deadline?: Date;
  isRemote: boolean;
  experienceLevel: Job['experienceLevel'];
  aiCriteria?: Omit<JobAICriteria, 'id' | 'jobId'>;
}

// ===== CANDIDATE MANAGEMENT =====
export interface Candidate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsExperience?: number;
  salaryExpectationMin?: number;
  salaryExpectationMax?: number;
  availability?: string;
  source: 'linkedin' | 'indeed' | 'referral' | 'company_website' | 'other';
  referrerId?: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  skills?: CandidateSkill[];
  education?: CandidateEducation[];
  workExperience?: CandidateWorkExperience[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateSkill {
  id: string;
  candidateId: string;
  skillName: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience?: number;
  isVerified: boolean;
  extractedFrom: 'resume' | 'linkedin' | 'manual';
}

export interface CandidateEducation {
  id: string;
  candidateId: string;
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: Date;
  endDate?: Date;
  gpa?: number;
  isCurrent: boolean;
}

export interface CandidateWorkExperience {
  id: string;
  candidateId: string;
  company: string;
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent: boolean;
}

// ===== APPLICATION MANAGEMENT =====
export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: 'new' | 'reviewing' | 'phone_screen' | 'technical_interview' | 'final_interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
  currentStageId?: string;
  source: 'direct' | 'referral' | 'linkedin' | 'indeed' | 'ziprecruiter' | 'other';
  appliedDate: Date;
  coverLetter?: string;
  salaryExpectation?: number;
  availability?: string;
  notes?: string;
  withdrawnAt?: Date;
  withdrawalReason?: string;
  job?: Job;
  candidate?: Candidate;
  aiScore?: AIScore;
  documents?: ApplicationDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: 'resume' | 'cover_letter' | 'portfolio' | 'transcript' | 'other';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface AIScore {
  id: string;
  applicationId: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  confidenceLevel: number;
  aiSummary: string;
  processingTimeMs?: number;
  modelVersion?: string;
  biasFlags?: any;
  createdAt: Date;
}

export interface CreateApplicationRequest {
  jobId: string;
  candidateId: string;
  coverLetter?: string;
  salaryExpectation?: number;
  availability?: string;
  source: Application['source'];
}

// ===== PIPELINE MANAGEMENT =====
export interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  stageOrder: number;
  stageType: 'screening' | 'interview' | 'assessment' | 'reference' | 'offer' | 'final';
  isActive: boolean;
  autoAdvanceConditions?: any;
  createdAt: Date;
}

export interface ApplicationStageHistory {
  id: string;
  applicationId: string;
  stageId: string;
  enteredAt: Date;
  exitedAt?: Date;
  durationMinutes?: number;
  movedBy?: string;
  notes?: string;
  outcome?: 'advanced' | 'rejected' | 'withdrawn' | 'on_hold';
}

// ===== ANALYTICS & REPORTING =====
export interface DashboardMetrics {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  newApplicationsToday: number;
  totalCandidates: number;
  applicationsByStatus: Record<Application['status'], number>;
  recentApplications: Application[];
  topPerformingJobs: Job[];
  aiProcessingStats: {
    totalProcessed: number;
    averageScore: number;
    processingTime: number;
  };
}

// ===== API RESPONSES =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchFilters {
  search?: string;
  status?: string;
  department?: string;
  location?: string;
  jobType?: string;
  experienceLevel?: string;
  source?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
