import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage for settings (replace with real database in production)
let memoryDB = {
  system_settings: [
    { key: 'openai_api_key', value: '', updatedAt: new Date().toISOString() },
    { key: 'max_tokens', value: '1000', updatedAt: new Date().toISOString() },
    { key: 'temperature', value: '0.7', updatedAt: new Date().toISOString() },
    { key: 'model', value: 'gpt-4', updatedAt: new Date().toISOString() }
  ],
  prompts: [
    { 
      key: 'system_prompt', 
      value: 'You are an AI recruitment assistant. Analyze resumes and provide structured feedback for hiring decisions.',
      updatedAt: new Date().toISOString() 
    },
    { 
      key: 'resume_analysis_prompt', 
      value: 'Analyze this resume for the given job requirements. Provide a detailed assessment including: 1) Overall match score (0-100), 2) Key strengths, 3) Potential concerns, 4) Recommendation (STRONG_MATCH, GOOD_MATCH, POTENTIAL_MATCH, or POOR_MATCH).',
      updatedAt: new Date().toISOString() 
    },
    { 
      key: 'skills_extraction_prompt', 
      value: 'Extract and categorize all technical and soft skills from this resume. Return as structured JSON.',
      updatedAt: new Date().toISOString() 
    },
    { 
      key: 'response_format', 
      value: 'Always respond in JSON format with the specified fields. Ensure all responses are consistent and parseable.',
      updatedAt: new Date().toISOString() 
    }
  ]
};

function getMemoryDB() {
  return memoryDB;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  // Handle audit log requests
  if (action === 'audit-log') {
    if (req.method === 'GET') {
      try {
        const db = getMemoryDB();
        let auditLogs = (db as any).audit_log || [];
        
        // Filter by entity type
        if (req.query.entityType) {
          auditLogs = auditLogs.filter((log: any) => log.entityType === req.query.entityType);
        }
        
        // Filter by entity ID
        if (req.query.entityId) {
          auditLogs = auditLogs.filter((log: any) => log.entityId === req.query.entityId);
        }
        
        // Sort by timestamp (newest first)
        auditLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        return res.status(200).json({
          success: true,
          data: auditLogs
        });
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch audit logs'
        });
      }
    }
    return res.status(405).json({ success: false, error: 'Method not allowed for audit logs' });
  }

  try {
    switch (action) {
      case 'system':
        return await handleSystemSettings(req, res);
      case 'prompts':
        return await handlePrompts(req, res);
      case 'test-api-key':
        return await handleTestApiKey(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleSystemSettings(req: VercelRequest, res: VercelResponse) {
  const db = getMemoryDB();

  if (req.method === 'GET') {
    const settings = {};
    db.system_settings.forEach(setting => {
      settings[setting.key] = setting.value;
    });
    return res.status(200).json({ data: settings });
  }

  if (req.method === 'POST') {
    const updates = req.body;
    
    Object.entries(updates).forEach(([key, value]) => {
      const setting = db.system_settings.find(s => s.key === key);
      if (setting) {
        setting.value = value as string;
        setting.updatedAt = new Date().toISOString();
      } else {
        db.system_settings.push({
          key,
          value: value as string,
          updatedAt: new Date().toISOString()
        });
      }
    });

    return res.status(200).json({ message: 'Settings updated successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handlePrompts(req: VercelRequest, res: VercelResponse) {
  const db = getMemoryDB();

  if (req.method === 'GET') {
    const prompts = {};
    db.prompts.forEach(prompt => {
      prompts[prompt.key] = prompt.value;
    });
    return res.status(200).json({ data: prompts });
  }

  if (req.method === 'POST') {
    const updates = req.body;
    
    Object.entries(updates).forEach(([key, value]) => {
      const prompt = db.prompts.find(p => p.key === key);
      if (prompt) {
        prompt.value = value as string;
        prompt.updatedAt = new Date().toISOString();
      } else {
        db.prompts.push({
          key,
          value: value as string,
          updatedAt: new Date().toISOString()
        });
      }
    });

    return res.status(200).json({ message: 'Prompts updated successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleTestApiKey(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return res.status(200).json({ 
        success: true, 
        message: 'API key is valid' 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid API key' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to test API key' 
    });
  }
} 