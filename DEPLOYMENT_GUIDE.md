# 🚀 DEPLOYMENT GUIDE - RecruitAI

## 📊 Current Status
- **Build Status:** ✅ Successfully compiles  
- **Function Count:** 11/12 Vercel functions used
- **Ready for Deployment:** ✅ Yes (when daily limit resets)

---

## 🧹 VERCEL CLEANUP REQUIRED

### Current Deployment Issues:
```
Total Deployments: 20+ (hitting daily limit)
Error Deployments: 7+ failed builds
Ready Deployments: 13+ successful but outdated
Status: Deployment limit reached (100/day on Hobby plan)
```

### Cleanup Commands:
```bash
# Option 1: Clean all old deployments (RECOMMENDED)
vercel rm recruit-ai-v2 --safe

# Option 2: Remove specific error deployments
vercel rm https://recruit-ai-v2-1cwp9068a-jasonlbdevs-projects.vercel.app
vercel rm https://recruit-ai-v2-ot9lyu3zd-jasonlbdevs-projects.vercel.app
# ... repeat for all error deployments

# Option 3: Clean deployments older than 24h
vercel ls | grep "Error" | xargs -I {} vercel rm {}
```

---

## 🔧 OPTIMAL DEPLOYMENT STRATEGY

### When Daily Limit Resets (in ~2 hours):
```bash
# 1. Ensure latest code is ready
npm run build                    # ✅ Verify build works
npm run typecheck               # ✅ Verify no TypeScript errors

# 2. Deploy with production settings
vercel --prod                   # Deploy to production
vercel alias                    # Set up custom domain (if configured)

# 3. Verify deployment
curl https://recruit-ai-v2.vercel.app/api/ping
```

### Post-Deployment Checklist:
- [ ] Dashboard loads with real metrics
- [ ] Jobs search functionality works
- [ ] Candidates creation (both AI and manual) works
- [ ] All API endpoints respond correctly
- [ ] Search and filtering functional across all pages

---

## ⚙️ VERCEL CONFIGURATION OPTIMIZATION

### Current vercel.json (Optimized):
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/spa",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot))",
      "dest": "/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.3.0"
    }
  }
}
```

### Environment Variables Needed:
```bash
# In Vercel Dashboard → Settings → Environment Variables
OPENAI_API_KEY=sk-...  # Required for AI functionality
NODE_ENV=production    # Already configured
```

---

## 📦 FUNCTION OPTIMIZATION

### Current Function Usage: 11/12
```
✅ api/candidates.ts
✅ api/jobs.ts  
✅ api/applications.ts
✅ api/upload-resume.ts
✅ api/bulk-upload-resumes.ts
✅ api/ai-analyze.ts
✅ api/settings.ts
✅ api/auth/login.ts
✅ api/auth/me.ts
✅ api/dashboard/metrics.ts
❓ api/init-db.ts (can be removed - utility only)
```

### Optimization Opportunity:
```bash
# Remove init-db.ts endpoint (not needed as API)
rm api/init-db.ts

# Or convert to utility function only
mv api/init-db.ts utils/init-db.ts
```

---

## 🔍 MONITORING & DEBUGGING

### Health Check Endpoints:
```bash
# API Health
curl https://recruit-ai-v2.vercel.app/api/ping

# Dashboard Data
curl https://recruit-ai-v2.vercel.app/api/dashboard/metrics

# Jobs API
curl https://recruit-ai-v2.vercel.app/api/jobs

# Candidates API  
curl https://recruit-ai-v2.vercel.app/api/candidates
```

### Error Monitoring:
```bash
# View deployment logs
vercel logs

# View function logs
vercel logs --follow

# Check specific function
vercel logs api/candidates.ts
```

---

## 🚨 DEPLOYMENT LIMITS & WARNINGS

### Hobby Plan Limits:
- **Deployments:** 100 per day (currently at limit)
- **Functions:** 12 maximum (using 11)
- **Build Time:** 45 minutes maximum
- **Function Duration:** 10 seconds maximum

### Best Practices to Avoid Limits:
1. **Test locally first:** Always run `npm run build` before deploying
2. **Batch changes:** Don't deploy every small change immediately
3. **Use preview deployments:** Test on feature branches first
4. **Clean old deployments:** Regularly remove failed/old deployments

---

## 📋 POST-DEPLOYMENT TASKS

### Immediate (After Deployment):
1. Configure OpenAI API key in Settings page
2. Test AI candidate creation with sample resume
3. Verify search functionality across all pages
4. Test bulk upload with multiple files

### Within 24 Hours:
1. Monitor function performance and errors
2. Check memory usage and optimization opportunities
3. Test with real user scenarios
4. Document any additional issues found

### Ongoing:
1. Monitor deployment frequency to stay under limits
2. Optimize function performance
3. Consider upgrading to Pro plan if usage increases
4. Set up custom domain for production use

---

## 🎯 SUCCESS METRICS

### Technical Metrics:
- [ ] All API endpoints respond < 3 seconds
- [ ] Frontend loads < 2 seconds
- [ ] Search results return < 1 second
- [ ] File uploads process < 10 seconds

### Functional Metrics:
- [ ] AI candidate extraction works reliably
- [ ] Bulk upload processes 10+ resumes successfully
- [ ] Dashboard shows accurate real-time data
- [ ] All CRUD operations function correctly

---

*Updated: January 31, 2025 - Post-recovery deployment guide* 