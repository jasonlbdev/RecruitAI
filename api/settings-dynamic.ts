import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Import database functions dynamically
    const { getSystemSettings, updateSystemSetting } = await import('../lib/database');
    
    const { action } = req.query;

    // Handle basic GET request (no action parameter)
    if (req.method === 'GET' && !action) {
      return await handleGetSettings(req, res, getSystemSettings);
    }

    // Handle POST request (save settings)
    if (req.method === 'POST' && !action) {
      return await handleSaveSettings(req, res, updateSystemSetting);
    }

    // Handle specific actions
    switch (action) {
      case 'system':
        return await handleSystemSettings(req, res, getSystemSettings, updateSystemSetting);
      case 'prompts':
        return await handlePrompts(req, res, getSystemSettings, updateSystemSetting);
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle basic settings GET request
async function handleGetSettings(req: VercelRequest, res: VercelResponse, getSystemSettings: any) {
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
async function handleSaveSettings(req: VercelRequest, res: VercelResponse, updateSystemSetting: any) {
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

async function handleSystemSettings(req: VercelRequest, res: VercelResponse, getSystemSettings: any, updateSystemSetting: any) {
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

async function handlePrompts(req: VercelRequest, res: VercelResponse, getSystemSettings: any, updateSystemSetting: any) {
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