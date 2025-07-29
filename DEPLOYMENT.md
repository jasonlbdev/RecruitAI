# RecruitAI Deployment Guide

## Quick Deploy to Vercel

### Prerequisites
- Vercel account
- GitHub repository with the RecruitAI code
- OpenAI API key (for AI resume analysis)

### Step 1: Environment Variables

Set up the following environment variables in your Vercel project settings:

```bash
# Required
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=your-openai-api-key

# Optional - Database (SQLite is used by default)
DATABASE_URL=postgresql://username:password@hostname:port/database

# Optional - File Upload Settings
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Optional - CORS
CORS_ORIGIN=*
```

### Step 2: Deploy to Vercel

1. **Connect GitHub Repository**
   ```bash
   # Install Vercel CLI (optional)
   npm i -g vercel
   
   # Or deploy directly from Vercel dashboard
   # https://vercel.com/new
   ```

2. **Configure Project Settings**
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Deploy**
   ```bash
   # Using CLI
   vercel --prod
   
   # Or push to your main branch if connected via GitHub
   git push origin main
   ```

### Step 3: Database Setup

#### Option A: SQLite (Default - for development/small scale)
- No additional setup required
- Database file is created automatically
- Data persists between deployments

#### Option B: PostgreSQL (Recommended for production)
1. Set up a PostgreSQL database (Vercel Postgres, Supabase, PlanetScale, etc.)
2. Add `DATABASE_URL` environment variable
3. Update `server/database.ts` to use PostgreSQL instead of SQLite

### Step 4: Post-Deployment Setup

1. **Create Admin User**
   - The system creates a default admin user on first startup:
     - Email: `admin@recruitai.com`
     - Password: `admin123`
   - **IMPORTANT**: Change this password immediately after deployment!

2. **Test API Endpoints**
   ```bash
   # Health check
   curl https://your-app.vercel.app/api/ping
   
   # Login test
   curl -X POST https://your-app.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@recruitai.com","password":"admin123"}'
   ```

3. **Frontend Access**
   - Navigate to your Vercel URL
   - Login with the admin credentials
   - Start using the RecruitAI platform!

## Features Available in Current MVP

### ✅ Completed Features

1. **Authentication System**
   - JWT-based authentication
   - User registration and login
   - Role-based access control
   - Secure password hashing

2. **Job Management**
   - Create, read, update, delete jobs
   - Job search and filtering
   - AI criteria configuration
   - Job status management

3. **Candidate Management**
   - Candidate profiles with skills, education, experience
   - Search and filtering capabilities
   - Candidate source tracking
   - Blacklist management

4. **Dashboard Analytics**
   - Job statistics
   - Application metrics
   - Recent activity feed
   - Performance indicators

5. **Database Schema**
   - Complete relational database design
   - Foreign key constraints
   - Data validation
   - Audit trails

### 🚧 In Progress / TODO

1. **Application Processing**
   - Submit applications
   - Application status tracking
   - Pipeline management
   - Bulk operations

2. **File Upload & Resume Parsing**
   - PDF/DOC resume upload
   - Text extraction
   - Structured data parsing
   - File storage management

3. **AI Integration**
   - OpenAI API integration
   - Resume analysis and scoring
   - Skill extraction
   - Bias detection

4. **Advanced Features**
   - Email notifications
   - Interview scheduling
   - Onboarding workflows
   - Advanced reporting

## API Documentation

### Authentication Endpoints
```
POST   /api/auth/login      # Login user
POST   /api/auth/register   # Register new user
POST   /api/auth/logout     # Logout user
POST   /api/auth/refresh    # Refresh token
GET    /api/auth/me         # Get current user
```

### Job Management
```
GET    /api/jobs            # List jobs (with filters)
POST   /api/jobs            # Create new job
GET    /api/jobs/:id        # Get job details
PUT    /api/jobs/:id        # Update job
DELETE /api/jobs/:id        # Delete job
```

### Candidate Management
```
GET    /api/candidates      # List candidates (with filters)
POST   /api/candidates      # Create new candidate
GET    /api/candidates/:id  # Get candidate details
PUT    /api/candidates/:id  # Update candidate
DELETE /api/candidates/:id  # Delete candidate
```

### Dashboard
```
GET    /api/dashboard/metrics  # Get dashboard metrics
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` environment variable
   - Ensure database is accessible from Vercel
   - Verify connection string format

2. **Authentication Issues**
   - Check `JWT_SECRET` is set
   - Verify token expiration settings
   - Clear browser localStorage

3. **API Errors**
   - Check Vercel function logs
   - Verify environment variables
   - Test endpoints individually

4. **Build Failures**
   - Check TypeScript compilation
   - Verify all dependencies are installed
   - Review build logs in Vercel dashboard

### Support

For issues or questions:
1. Check the GitHub repository issues
2. Review Vercel deployment logs
3. Test with local development setup first

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The development server runs on `http://localhost:8080` with hot reload for both frontend and backend.

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to git
   - Use strong JWT secrets
   - Rotate API keys regularly

2. **Database Security**
   - Use parameterized queries (already implemented)
   - Enable foreign key constraints
   - Regular backups

3. **File Uploads**
   - Validate file types and sizes
   - Scan for malware
   - Store in secure cloud storage

4. **API Security**
   - Rate limiting (implement if needed)
   - Input validation (already implemented)
   - CORS configuration 