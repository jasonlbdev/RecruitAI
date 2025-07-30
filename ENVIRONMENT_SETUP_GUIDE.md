# 🔧 ENVIRONMENT SETUP GUIDE

## **📋 Step-by-Step Setup for Vercel Deployment**

### **✅ STEP 1: Neon Database (COMPLETE)**
You already have the credentials! ✅

```env
DATABASE_URL=postgres://neondb_owner:npg_I21xeijMPSty@ep-gentle-shadow-ab3lml3w-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

### **✅ STEP 2: Vercel Blob Storage (COMPLETE)**  
You already have the token! ✅

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_S8eaS8aKMwnqJP7g_ty97sE86UO8da91jtH78KbY6kKPiC8
```

### **🔄 STEP 3: Grok xAI API Key (IN PROGRESS)**

#### **How to Get FREE Grok API Key:**

1. **Go to:** https://console.x.ai/
2. **Sign up** with your X/Twitter account or email
3. **Navigate to:** API Keys section
4. **Create new API key** - you get free credits to start
5. **Copy the key** - it should look like: `grok_live_xxxxxxxxxx`

**Your environment variable will be:**
```env
GROK_API_KEY=grok_live_your_actual_key_here
```

---

## **🚀 SETTING UP IN VERCEL**

### **Step 1: Go to Vercel Dashboard**
1. Open https://vercel.com/dashboard
2. Find your RecruitAI project
3. Click → Settings → Environment Variables

### **Step 2: Add All 3 Variables**
```env
DATABASE_URL=postgres://neondb_owner:npg_I21xeijMPSty@ep-gentle-shadow-ab3lml3w-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

BLOB_READ_WRITE_TOKEN=vercel_blob_rw_S8eaS8aKMwnqJP7g_ty97sE86UO8da91jtH78KbY6kKPiC8

GROK_API_KEY=grok_live_your_actual_key_here
```

### **Step 3: Redeploy**
- Vercel will automatically redeploy when you add environment variables
- Or manually trigger redeploy from the Deployments tab

---

## **🗄️ DATABASE SCHEMA SETUP**

### **Initialize Your Neon Database:**

1. **Go to:** https://console.neon.tech/
2. **Find your project:** "RecruitAI" 
3. **Open SQL Editor**
4. **Copy and paste** the contents of `scripts/init-database.sql`
5. **Run the script** - this creates all tables and default settings

**Or run it directly from here:**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (jobs, candidates, applications, etc.)
-- Insert default system settings with Grok API key
-- Set up indexes and constraints
```

---

## **🧪 TESTING YOUR SETUP**

### **Step 1: Test Database Connection**
```bash
curl https://your-app.vercel.app/api/init-db
```

Expected: `{"success": true, "message": "Database connection test successful"}`

### **Step 2: Test Full Integration**
```bash
curl -X POST https://your-app.vercel.app/api/test-integrations
```

Expected: 
```json
{
  "success": true,
  "neon_database": "connected",
  "vercel_blob": "ready", 
  "grok_ai": "operational"
}
```

### **Step 3: Test Resume Upload**
1. Open your app in browser
2. Go to Candidates page
3. Try uploading a resume
4. Verify AI analysis works

---

## **🎯 WHAT YOU'LL HAVE WORKING**

✅ **Complete recruitment platform** with real data  
✅ **AI-powered resume analysis** using free Grok  
✅ **Persistent file storage** for resumes  
✅ **Professional database** with proper relationships  
✅ **Zero monthly costs** using free tiers  

**Ready for production use! 🚀** 