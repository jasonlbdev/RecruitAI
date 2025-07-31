import { VercelRequest, VercelResponse } from '@vercel/node';

// Inline database functions - no external imports
async function getSystemSettings() {
  try {
    if (!process.env.DATABASE_URL) {
      return [
        { key: 'ai_provider', value: 'openai' },
        { key: 'openai_api_key', value: '' },
        { key: 'openai_model', value: 'gpt-4o' },
        { key: 'xai_api_key', value: '' },
        { key: 'xai_model', value: 'grok-3-mini' },
        { key: 'max_tokens', value: '1500' },
        { key: 'temperature', value: '0.7' },
        { key: 'system_prompt', value: 'You are an expert recruitment assistant.' },
        { key: 'resume_analysis_prompt', value: 'Analyze this resume and extract key information including name, email, phone, skills, experience, and qualifications. Return the analysis in JSON format.' }
      ];
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`SELECT * FROM system_settings ORDER BY key`;
    return result.length > 0 ? result : [
      { key: 'ai_provider', value: 'openai' },
      { key: 'openai_model', value: 'gpt-4o' },
      { key: 'xai_model', value: 'grok-3-mini' }
    ];
  } catch (error) {
    console.error('getSystemSettings error:', error);
    return [
      { key: 'ai_provider', value: 'openai' },
      { key: 'openai_model', value: 'gpt-4o' },
      { key: 'xai_model', value: 'grok-3-mini' }
    ];
  }
}

async function updateSystemSetting(key: string, value: string) {
  try {
    if (!process.env.DATABASE_URL) return false;
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    // Validate API keys to prevent corruption
    if (key === 'openai_api_key' || key === 'xai_api_key') {
      // Ensure the value is a clean API key
      if (value && !value.startsWith('sk-') && !value.startsWith('xai-')) {
        console.error('Invalid API key format:', key);
        return false;
      }
    }
    
    await sql`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value, 
        updated_at = CURRENT_TIMESTAMP
    `;
    return true;
  } catch (error) {
    console.error('updateSystemSetting error:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    // Handle basic GET request (no action parameter)
    if (req.method === 'GET' && !action) {
      return await handleGetSettings(req, res);
    }

    // Handle POST request (save settings)
    if (req.method === 'POST' && !action) {
      return await handleSaveSettings(req, res);
    }

    // Handle specific actions
    switch (action) {
      case 'system':
        return await handleSystemSettings(req, res);
      case 'prompts':
        return await handlePrompts(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle basic settings GET request
async function handleGetSettings(req: VercelRequest, res: VercelResponse) {
  try {
    const settings = await getSystemSettings();
    
    // Convert array to object for easier frontend consumption
    const settingsObject: any = {};
    settings.forEach((setting: any) => {
      settingsObject[setting.key] = setting.value;
    });

    return res.status(200).json({
      success: true,
      settings: settingsObject
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
}

// Handle basic settings POST request (save)
async function handleSaveSettings(req: VercelRequest, res: VercelResponse) {
  try {
    const settingsData = req.body;
    
    // Update each setting
    for (const [key, value] of Object.entries(settingsData)) {
      if (typeof value === 'string' || typeof value === 'number') {
        const stringValue = String(value);
        
        // Special handling for API keys
        if (key === 'openai_api_key' || key === 'xai_api_key') {
          // Only update if it's a valid API key or empty
          if (!stringValue || stringValue.startsWith('sk-') || stringValue.startsWith('xai-')) {
            await updateSystemSetting(key, stringValue);
          } else {
            console.error('Invalid API key format:', key, stringValue);
          }
        } else {
          await updateSystemSetting(key, stringValue);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save settings'
    });
  }
}

async function handleSystemSettings(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const settings = await getSystemSettings();
      
      // Convert to key-value object
      const settingsObject: any = {};
      settings.forEach((setting: any) => {
        settingsObject[setting.key] = setting.value;
      });

      return res.status(200).json({
        success: true,
        settings: settingsObject
      });
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch system settings'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const settingsData = req.body;
      
      // Update each setting
      for (const [key, value] of Object.entries(settingsData)) {
        if (typeof value === 'string' || typeof value === 'number') {
          await updateSystemSetting(key, String(value));
        }
      }

      return res.status(200).json({
        success: true,
        message: 'System settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating system settings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update system settings'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

async function handlePrompts(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const settings = await getSystemSettings();
      
      // Filter for prompt-related settings
      const promptSettings = settings.filter((setting: any) => 
        setting.key.includes('prompt') || setting.key.includes('system')
      );
      
      const promptObject: any = {};
      promptSettings.forEach((setting: any) => {
        promptObject[setting.key] = setting.value;
      });

      return res.status(200).json({
        success: true,
        prompts: promptObject
      });
    } catch (error) {
      console.error('Error fetching prompts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch prompts'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const promptData = req.body;
      
      // Update each prompt
      for (const [key, value] of Object.entries(promptData)) {
        if (typeof value === 'string' || typeof value === 'number') {
          await updateSystemSetting(key, String(value));
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Prompts updated successfully'
      });
    } catch (error) {
      console.error('Error updating prompts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update prompts'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 