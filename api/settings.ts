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

  // Handle audit log requests
  if (action === 'audit-log') {
    if (req.method === 'GET') {
      try {
        // For now, return empty audit logs since we haven't implemented this yet
        return res.status(200).json({
          success: true,
          data: []
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
  if (req.method === 'GET') {
    try {
      const settings = await getSystemSettings();
      return res.status(200).json({
        success: true,
        data: settings
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
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Key and value are required'
        });
      }

      const updatedSetting = await updateSystemSetting(key, value);
      
      return res.status(200).json({
        success: true,
        data: updatedSetting,
        message: `${key} updated successfully`
      });
    } catch (error) {
      console.error('Error updating system setting:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update system setting'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handlePrompts(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const prompts = await getSystemSettings();
      const promptSettings = prompts.filter((setting: any) => 
        ['system_prompt', 'resume_analysis_prompt', 'skills_extraction_prompt', 'response_format'].includes(setting.key)
      );
      
      return res.status(200).json({
        success: true,
        data: promptSettings
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
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Key and value are required'
        });
      }

      const updatedPrompt = await updateSystemSetting(key, value);
      
      return res.status(200).json({
        success: true,
        data: updatedPrompt,
        message: `${key} updated successfully`
      });
    } catch (error) {
      console.error('Error updating prompt:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update prompt'
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
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }

    // Test Grok API key
    const testResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message to verify the API key works.'
          }
        ],
        max_tokens: 10
      }),
    });

    if (testResponse.ok) {
      return res.status(200).json({
        success: true,
        message: 'Grok API key is valid and working'
      });
    } else {
      const errorData = await testResponse.text();
      return res.status(400).json({
        success: false,
        error: `Grok API key test failed: ${testResponse.status} - ${errorData}`
      });
    }
  } catch (error) {
    console.error('Error testing Grok API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test Grok API key'
    });
  }
} 