import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { randomUUID } from 'crypto';
import bcryptjs from 'bcryptjs';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initDatabase() {
  if (db) return db;

  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON');
  await createTables();
  await insertDefaultData();
  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

async function createTables() {
  if (!db) throw new Error('Database not initialized');

  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'hr_manager', 'recruiter', 'viewer')),
      department TEXT,
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User sessions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      user_id TEXT NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // System settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Jobs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      job_type TEXT NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
      employment_type TEXT NOT NULL CHECK (employment_type IN ('permanent', 'temporary', 'contract')),
      salary_min INTEGER,
      salary_max INTEGER,
      description TEXT NOT NULL,
      requirements TEXT, -- JSON array
      nice_to_have TEXT, -- JSON array
      posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      deadline DATETIME,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'cancelled')),
      created_by TEXT NOT NULL,
      hiring_manager TEXT,
      is_remote INTEGER DEFAULT 0,
      experience_level TEXT NOT NULL CHECK (experience_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'executive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (hiring_manager) REFERENCES users(id)
    )
  `);

  // Job AI criteria table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS job_ai_criteria (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      job_id TEXT NOT NULL,
      required_skills TEXT, -- JSON array
      preferred_skills TEXT, -- JSON array
      minimum_experience_years INTEGER DEFAULT 0,
      education_requirements TEXT, -- JSON array
      certification_requirements TEXT, -- JSON array
      custom_prompts TEXT, -- JSON object
      weight_skills INTEGER DEFAULT 30,
      weight_experience INTEGER DEFAULT 25,
      weight_education INTEGER DEFAULT 20,
      weight_location INTEGER DEFAULT 15,
      weight_culture_fit INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);

  // Candidates table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      location TEXT,
      linkedin_url TEXT,
      portfolio_url TEXT,
      resume_file_path TEXT,
      resume_text TEXT,
      summary TEXT,
      years_of_experience INTEGER DEFAULT 0,
      current_position TEXT,
      current_company TEXT,
      desired_salary_min INTEGER,
      desired_salary_max INTEGER,
      availability_date DATETIME,
      visa_status TEXT,
      is_remote_ok INTEGER DEFAULT 1,
      source TEXT, -- 'manual', 'linkedin', 'indeed', 'referral', etc.
      source_details TEXT,
      is_blacklisted INTEGER DEFAULT 0,
      blacklist_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Candidate skills table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidate_skills (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      candidate_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
      years_of_experience INTEGER DEFAULT 0,
      is_primary INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);

  // Candidate education table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidate_education (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      candidate_id TEXT NOT NULL,
      institution TEXT NOT NULL,
      degree TEXT NOT NULL,
      field_of_study TEXT NOT NULL,
      graduation_year INTEGER,
      gpa REAL,
      honors TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);

  // Candidate work experience table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidate_work_experience (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      candidate_id TEXT NOT NULL,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      is_current INTEGER DEFAULT 0,
      description TEXT,
      achievements TEXT, -- JSON array
      technologies_used TEXT, -- JSON array
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);

  // Pipeline stages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL,
      is_default INTEGER DEFAULT 0,
      color TEXT DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Applications table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      job_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      current_stage_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'interview_scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn')),
      applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT,
      cover_letter TEXT,
      salary_expectation INTEGER,
      notice_period_days INTEGER,
      recruiter_notes TEXT,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (current_stage_id) REFERENCES pipeline_stages(id),
      UNIQUE(job_id, candidate_id)
    )
  `);

  // Application documents table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS application_documents (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      application_id TEXT NOT NULL,
      document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'cover_letter', 'portfolio', 'certificate', 'other')),
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // AI scores table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_scores (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      application_id TEXT NOT NULL,
      overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
      skills_score INTEGER CHECK (skills_score >= 0 AND skills_score <= 100),
      experience_score INTEGER CHECK (experience_score >= 0 AND experience_score <= 100),
      education_score INTEGER CHECK (education_score >= 0 AND education_score <= 100),
      location_score INTEGER CHECK (location_score >= 0 AND location_score <= 100),
      confidence_level REAL CHECK (confidence_level >= 0 AND confidence_level <= 1),
      summary TEXT,
      key_strengths TEXT, -- JSON array
      concerns TEXT, -- JSON array
      extracted_skills TEXT, -- JSON array
      recommendations TEXT, -- JSON array
      processing_time_ms INTEGER,
      model_used TEXT,
      prompt_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // Application stage history table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS application_stage_history (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      application_id TEXT NOT NULL,
      from_stage_id TEXT,
      to_stage_id TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      change_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (from_stage_id) REFERENCES pipeline_stages(id),
      FOREIGN KEY (to_stage_id) REFERENCES pipeline_stages(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )
  `);
}

async function insertDefaultData() {
  if (!db) throw new Error('Database not initialized');

  // Check if admin user already exists
  const existingUser = await db.get('SELECT id FROM users WHERE email = ?', 'admin@recruitai.com');
  
  if (!existingUser) {
    // Create default admin user
    const adminId = randomUUID();
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    
    await db.run(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, department)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [adminId, 'admin@recruitai.com', hashedPassword, 'Admin', 'User', 'admin', 'IT']);
  }

  // Check if pipeline stages exist
  const existingStages = await db.get('SELECT id FROM pipeline_stages LIMIT 1');
  
  if (!existingStages) {
    // Create default pipeline stages
    const stages = [
      { name: 'Applied', description: 'Initial application received', sort_order: 1, is_default: 1, color: '#6B7280' },
      { name: 'Screening', description: 'Resume and initial screening', sort_order: 2, is_default: 1, color: '#3B82F6' },
      { name: 'Phone Interview', description: 'Initial phone/video interview', sort_order: 3, is_default: 1, color: '#8B5CF6' },
      { name: 'Technical Interview', description: 'Technical assessment and interview', sort_order: 4, is_default: 1, color: '#F59E0B' },
      { name: 'Final Interview', description: 'Final interview with hiring manager', sort_order: 5, is_default: 1, color: '#EF4444' },
      { name: 'Offer', description: 'Job offer extended', sort_order: 6, is_default: 1, color: '#10B981' },
      { name: 'Hired', description: 'Candidate accepted and hired', sort_order: 7, is_default: 1, color: '#059669' },
      { name: 'Rejected', description: 'Application rejected', sort_order: 8, is_default: 1, color: '#DC2626' }
    ];

    for (const stage of stages) {
      await db.run(`
        INSERT INTO pipeline_stages (id, name, description, sort_order, is_default, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [randomUUID(), stage.name, stage.description, stage.sort_order, stage.is_default, stage.color]);
    }
  }

  // Check if default system settings exist
  const existingSettings = await db.get('SELECT id FROM system_settings LIMIT 1');
  
  if (!existingSettings) {
    // Create default system settings
    const defaultSettings = [
      { key: 'max_tokens', value: '1500', description: 'Maximum tokens for AI responses' },
      { key: 'temperature', value: '0.1', description: 'AI temperature setting for consistency' },
      { key: 'model', value: 'gpt-4', description: 'Default OpenAI model to use' },
      { key: 'app_name', value: 'RecruitAI', description: 'Application name', is_public: 1 },
      { key: 'app_version', value: '1.0.0', description: 'Application version', is_public: 1 }
    ];

    for (const setting of defaultSettings) {
      await db.run(`
        INSERT INTO system_settings (id, key, value, description, is_public)
        VALUES (?, ?, ?, ?, ?)
      `, [randomUUID(), setting.key, setting.value, setting.description, setting.is_public || 0]);
    }
  }
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
} 