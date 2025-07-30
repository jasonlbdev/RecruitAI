import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSystemSettings, updateSystemSetting, getSystemSetting } from '../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
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
        data: settingsObject
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
      const { settings } = req.body;
      
      // Update all settings
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value === 'string') {
          await updateSystemSetting(key, value);
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

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handlePrompts(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const prompts: any = {};
      const promptKeys = ['system_prompt', 'resume_analysis_prompt', 'skills_extraction_prompt', 'response_format'];
      
      for (const key of promptKeys) {
        const setting = await getSystemSetting(key);
        prompts[key] = setting || '';
      }

      return res.status(200).json({
        success: true,
        prompts: prompts
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
        message: 'Prompt templates updated successfully'
      });
    } catch (error) {
      console.error('Error updating prompts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update prompts'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleTestApiKey(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get current AI provider and API key
    const aiProvider = await getSystemSetting('ai_provider') || 'openai';
    const apiKey = await getSystemSetting(aiProvider === 'openai' ? 'openai_api_key' : 'xai_api_key');

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: `${aiProvider.toUpperCase()} API key not configured`
      });
    }

    // Test the appropriate API
    let testUrl = '';
    let testBody = {};
    
    if (aiProvider === 'openai') {
      testUrl = 'https://api.openai.com/v1/chat/completions';
      testBody = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, this is a test message. Please respond with "Test successful".' }],
        max_tokens: 20
      };
    } else {
      testUrl = 'https://api.x.ai/v1/chat/completions';
      testBody = {
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'Hello, this is a test message. Please respond with "Test successful".' }],
        max_tokens: 20
      };
    }

    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBody),
    });

    if (testResponse.ok) {
      return res.status(200).json({
        success: true,
        message: `${aiProvider.toUpperCase()} API key is valid and working correctly.`
      });
    } else {
      const errorText = await testResponse.text();
      return res.status(400).json({
        success: false,
        error: `${aiProvider.toUpperCase()} API test failed: ${testResponse.status} - ${errorText}`
      });
    }
  } catch (error) {
    console.error('API key test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test API key'
    });
  }
} 