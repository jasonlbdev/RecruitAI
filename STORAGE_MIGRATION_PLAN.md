# 🗄️ STORAGE MIGRATION PLAN - Remove ALL Mock Data

## **CURRENT PROBLEMS**
❌ **Extensive mock data in `api/init-db.ts`** - 640 lines of fake jobs, candidates, applications
❌ **In-memory database** - Data lost on every deployment  
❌ **Mock data in client pages** - Fake analytics, pipeline stages, hiring managers
❌ **No file storage** - Resume uploads not persisted
❌ **OpenAI dependency** - Expensive API calls for testing

---

## **NEW VERCEL STORAGE ARCHITECTURE**

### **1. Neon Serverless Postgres** 
- **Purpose:** Primary database for all application data
- **Benefits:** Persistent, scalable, auto-scaling, generous free tier
- **Tables:** jobs, candidates, applications, users, settings, audit_logs

### **2. Vercel Blob Storage**
- **Purpose:** File storage for resumes, documents, uploads
- **Benefits:** CDN-backed, secure URLs, automatic compression
- **Usage:** Resume PDFs, cover letters, profile images

### **3. Grok by xAI (Free)**
- **Purpose:** AI analysis and candidate evaluation
- **Benefits:** Free tier, fast inference, good for testing
- **Replace:** All OpenAI API calls

---

## **MIGRATION STEPS**

### **PHASE 1: Database Setup** 🗄️

#### **Step 1.1: Install Neon Dependencies**
```bash
npm install @neondatabase/serverless
npm install drizzle-orm drizzle-kit
npm install @types/pg
```

#### **Step 1.2: Create Database Schema**
```sql
-- jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(100),
  location VARCHAR(255),
  type VARCHAR(50),
  salary_min INTEGER,
  salary_max INTEGER,
  experience_level VARCHAR(50),
  skills JSONB,
  requirements JSONB,
  benefits JSONB,
  status VARCHAR(50) DEFAULT 'active',
  deadline DATE,
  scoring_weights JSONB,
  is_remote BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- candidates table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  location VARCHAR(255),
  current_position VARCHAR(255),
  current_company VARCHAR(255),
  years_experience INTEGER,
  skills JSONB,
  summary TEXT,
  education JSONB,
  work_experience JSONB,
  resume_blob_url VARCHAR(500),
  ai_score INTEGER,
  ai_analysis TEXT,
  status VARCHAR(50) DEFAULT 'active',
  is_blacklisted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- applications table  
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  candidate_id UUID REFERENCES candidates(id),
  status VARCHAR(50) DEFAULT 'new',
  stage VARCHAR(100) DEFAULT 'Application Submitted',
  ai_score INTEGER,
  notes TEXT,
  applied_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Step 1.3: Create Database Connection**
```typescript
// lib/database.ts
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export { sql };
```

### **PHASE 2: Remove Mock Data** 🗑️

#### **Step 2.1: Clean init-db.ts**
```typescript
// BEFORE: 640 lines of mock data
let memoryDB: any = { jobs: [...], candidates: [...], applications: [...] }

// AFTER: Empty structure, database-backed
export async function getJobs() {
  return await sql`SELECT * FROM jobs ORDER BY created_at DESC`;
}

export async function getCandidates() {
  return await sql`SELECT * FROM candidates ORDER BY created_at DESC`;  
}
```

#### **Step 2.2: Remove Client Mock Data**
- `client/pages/Reports.tsx` - Remove hardcoded analytics
- `client/pages/Pipeline.tsx` - Remove mock pipeline stages  
- `client/pages/OnboardingTracking.tsx` - Remove fake hiring managers

### **PHASE 3: Vercel Blob Integration** 📁

#### **Step 3.1: Install Blob Dependencies**
```bash
npm install @vercel/blob
```

#### **Step 3.2: Update Resume Upload**
```typescript
// api/upload-resume.ts
import { put } from '@vercel/blob';

// Upload to Vercel Blob instead of mock storage
const blob = await put(`resumes/${fileName}`, file, {
  access: 'public',
});

// Store blob.url in database instead of local path
await sql`
  INSERT INTO candidates (resume_blob_url, ...) 
  VALUES (${blob.url}, ...)
`;
```

### **PHASE 4: Grok AI Integration** 🤖

#### **Step 4.1: Replace OpenAI Endpoints**
```typescript
// BEFORE: OpenAI API
const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${openaiKey}` },
  body: JSON.stringify({ model: 'gpt-4', ... })
});

// AFTER: Grok API  
const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${grokKey}` },
  body: JSON.stringify({ model: 'grok-beta', ... })
});
```

#### **Step 4.2: Update Settings**
- Remove OpenAI API key requirement
- Add Grok API key configuration
- Update model options to Grok models

### **PHASE 5: API Endpoint Updates** 🔌

#### **Step 5.1: Jobs API**
```typescript
// api/jobs.ts - Replace memory with database
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const jobs = await sql`SELECT * FROM jobs WHERE status = 'active'`;
    return res.json({ success: true, data: jobs });
  }
  
  if (req.method === 'POST') {
    const [job] = await sql`
      INSERT INTO jobs (title, description, department, ...)
      VALUES (${title}, ${description}, ${department}, ...)
      RETURNING *
    `;
    return res.json({ success: true, data: job });
  }
}
```

#### **Step 5.2: Candidates API**
- Replace `getMemoryDB()` with SQL queries
- Update CRUD operations to use database
- Handle file uploads via Vercel Blob

#### **Step 5.3: Applications API**  
- Implement proper JOIN queries for candidate/job data
- Remove all mock data generation
- Add proper relationship constraints

---

## **ENVIRONMENT VARIABLES NEEDED**

```env
# Neon Database
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_token"

# Grok AI
GROK_API_KEY="grok_api_key"
```

---

## **BENEFITS OF MIGRATION**

✅ **No More Mock Data** - Real production-ready application
✅ **Persistent Storage** - Data survives deployments and restarts  
✅ **Scalable Architecture** - Handles real user loads
✅ **File Storage** - Proper resume and document handling
✅ **Free AI** - Grok testing without OpenAI costs
✅ **Professional Setup** - Production-grade database and storage

---

## **TESTING PLAN**

1. **Database Operations** - CRUD for jobs, candidates, applications
2. **File Uploads** - Resume storage and retrieval via Blob
3. **AI Analysis** - Grok-powered candidate evaluation  
4. **Data Integrity** - Foreign key constraints and relationships
5. **Performance** - Query optimization and caching
6. **Error Handling** - Graceful database connection failures

---

## **MIGRATION ORDER**

1. 🏗️ Set up Neon database and schema
2. 🗑️ Remove all mock data from codebase  
3. 📁 Configure Vercel Blob storage
4. 🤖 Replace OpenAI with Grok
5. 🔌 Update all API endpoints
6. 🧪 Test entire application end-to-end
7. 🚀 Deploy with real storage backend

This migration will transform the application from a mock data demo into a fully functional, production-ready recruitment platform! 🎯 