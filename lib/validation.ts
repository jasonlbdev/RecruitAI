import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email('Invalid email address');

// Phone validation
export const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');

// URL validation
export const urlSchema = z.string().url('Invalid URL');

// Candidate validation
export const candidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  location: z.string().min(1, 'Location is required').max(100, 'Location too long'),
  yearsOfExperience: z.number().min(0, 'Experience cannot be negative').max(50, 'Experience too high'),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  desiredSalaryMin: z.number().min(0, 'Salary cannot be negative'),
  desiredSalaryMax: z.number().min(0, 'Salary cannot be negative'),
  isRemoteOk: z.boolean(),
  source: z.string().optional(),
  resumeUrl: urlSchema.optional(),
  aiScore: z.number().min(0).max(100).optional()
});

// Job validation
export const jobSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(100, 'Job title too long'),
  company: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  location: z.string().min(1, 'Location is required').max(100, 'Location too long'),
  description: z.string().min(10, 'Description too short').max(2000, 'Description too long'),
  requirements: z.string().min(1, 'Requirements are required').max(1000, 'Requirements too long'),
  salaryMin: z.number().min(0, 'Salary cannot be negative'),
  salaryMax: z.number().min(0, 'Salary cannot be negative'),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
  isRemote: z.boolean(),
  isActive: z.boolean()
});

// Application validation
export const applicationSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
  status: z.enum(['new', 'reviewing', 'interviewed', 'offered', 'hired', 'rejected']),
  notes: z.string().max(1000, 'Notes too long').optional(),
  assignedTo: z.string().optional()
});

// AI settings validation
export const aiSettingsSchema = z.object({
  aiProvider: z.enum(['openai', 'xai']),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().min(1, 'OpenAI model is required'),
  xaiApiKey: z.string().optional(),
  xaiModel: z.string().min(1, 'xAI model is required'),
  maxTokens: z.number().min(100, 'Max tokens too low').max(4000, 'Max tokens too high'),
  temperature: z.number().min(0, 'Temperature too low').max(2, 'Temperature too high'),
  systemPrompt: z.string().min(1, 'System prompt is required').max(1000, 'System prompt too long'),
  resumeAnalysisPrompt: z.string().min(1, 'Resume analysis prompt is required').max(2000, 'Resume analysis prompt too long')
});

// Search validation
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  type: z.enum(['candidate', 'job', 'application']).optional(),
  limit: z.number().min(1, 'Limit too low').max(100, 'Limit too high').optional()
});

// Filter validation
export const filterSchema = z.object({
  search: z.string().max(100, 'Search term too long').optional(),
  location: z.string().max(100, 'Location too long').optional(),
  experienceMin: z.number().min(0).max(50).optional(),
  experienceMax: z.number().min(0).max(50).optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  skills: z.array(z.string()).optional(),
  jobType: z.string().optional(),
  isRemote: z.boolean().optional(),
  status: z.string().optional(),
  dateRange: z.string().optional()
});

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[&]/g, '&amp;') // Escape ampersands
    .replace(/["]/g, '&quot;') // Escape quotes
    .replace(/[']/g, '&#x27;'); // Escape apostrophes
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, ''); // Keep only digits and plus sign
}

export function sanitizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Validation helper functions
export function validateCandidate(data: any) {
  try {
    return { success: true, data: candidateSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors : 'Validation failed' };
  }
}

export function validateJob(data: any) {
  try {
    return { success: true, data: jobSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors : 'Validation failed' };
  }
}

export function validateApplication(data: any) {
  try {
    return { success: true, data: applicationSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors : 'Validation failed' };
  }
}

export function validateAISettings(data: any) {
  try {
    return { success: true, data: aiSettingsSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors : 'Validation failed' };
  }
}

export function validateSearch(data: any) {
  try {
    return { success: true, data: searchSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors : 'Validation failed' };
  }
}

export function validateFilters(data: any) {
  try {
    return { success: true, data: filterSchema.parse(data) };
  } catch (error) {
    return { success: false, error: error instanceof z.ZodError ? error.errors : 'Validation failed' };
  }
} 