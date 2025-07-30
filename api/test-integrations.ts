import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, getAllJobs, createJob, getSystemSetting } from '../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const testResults = {
    neon_database: { status: 'pending', message: '', details: null as any },
    vercel_blob: { status: 'pending', message: '', details: null as any },
    grok_ai: { status: 'pending', message: '', details: null as any },
    overall_status: 'testing'
  };

  try {
    // Test 1: Neon Database Connection
    console.log('Testing Neon Database...');
    try {
      // Test basic connectivity
      const [dbTest] = await sql`SELECT NOW() as current_time`;
      
      // Test getting jobs (should work even if empty)
      const jobs = await getAllJobs();
      
      testResults.neon_database = {
        status: 'success',
        message: 'Database connection successful',
        details: {
          current_time: dbTest.current_time,
          jobs_count: jobs.length,
          connection: 'active'
        }
      };
    } catch (dbError) {
      testResults.neon_database = {
        status: 'error',
        message: `Database connection failed: ${dbError}`,
        details: { error: dbError instanceof Error ? dbError.message : String(dbError) }
      };
    }

    // Test 2: Vercel Blob Storage
    console.log('Testing Vercel Blob...');
    try {
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      
      if (!blobToken) {
        testResults.vercel_blob = {
          status: 'error',
          message: 'BLOB_READ_WRITE_TOKEN environment variable not set',
          details: { error: 'Missing environment variable' }
        };
      } else {
        // Test blob storage by creating a small test file
        const testContent = `Test file created at ${new Date().toISOString()}`;
        
        const blobResponse = await fetch('https://blob.vercel-storage.com', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${blobToken}`,
            'Content-Type': 'text/plain',
            'X-Filename': 'test-file.txt'
          },
          body: testContent
        });

        if (blobResponse.ok) {
          const blobData = await blobResponse.json();
          testResults.vercel_blob = {
            status: 'success',
            message: 'Vercel Blob storage working',
            details: {
              test_file_url: blobData.url,
              token_configured: true
            }
          };
        } else {
          const errorText = await blobResponse.text();
          testResults.vercel_blob = {
            status: 'error',
            message: `Vercel Blob test failed: ${blobResponse.status}`,
            details: { error: errorText }
          };
        }
      }
    } catch (blobError) {
      testResults.vercel_blob = {
        status: 'error',
        message: `Vercel Blob error: ${blobError}`,
        details: { error: blobError instanceof Error ? blobError.message : String(blobError) }
      };
    }

    // Test 3: Grok AI Integration
    console.log('Testing Grok AI...');
    try {
      const grokApiKey = process.env.GROK_API_KEY;
      
      if (!grokApiKey) {
        // Try to get from database settings
        const grokKeySetting = await getSystemSetting('grok_api_key');
        const dbGrokKey = grokKeySetting?.value;
        
        if (!dbGrokKey) {
          testResults.grok_ai = {
            status: 'error',
            message: 'Grok API key not configured in environment or database',
            details: { error: 'Missing API key configuration' }
          };
        } else {
          // Test with database key
          testResults.grok_ai = await testGrokAPI(dbGrokKey);
        }
      } else {
        // Test with environment key
        testResults.grok_ai = await testGrokAPI(grokApiKey);
      }
    } catch (grokError) {
      testResults.grok_ai = {
        status: 'error',
        message: `Grok AI error: ${grokError}`,
        details: { error: grokError instanceof Error ? grokError.message : String(grokError) }
      };
    }

    // Determine overall status
    const allPassed = Object.values(testResults).every(result => 
      typeof result === 'object' && result.status === 'success'
    );
    
    testResults.overall_status = allPassed ? 'all_systems_operational' : 'some_systems_need_attention';

    return res.status(200).json({
      success: true,
      message: allPassed ? 'All integrations working correctly!' : 'Some integrations need attention',
      data: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Integration test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Integration test failed',
      details: error instanceof Error ? error.message : String(error),
      partial_results: testResults
    });
  }
}

async function testGrokAPI(apiKey: string) {
  try {
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant.'
          },
          {
            role: 'user',
            content: 'Please respond with exactly "Integration test successful" to confirm the API is working.'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      }),
    });

    if (grokResponse.ok) {
      const grokData = await grokResponse.json();
      const aiResponse = grokData.choices[0]?.message?.content;
      
      return {
        status: 'success',
        message: 'Grok AI API working correctly',
        details: {
          model: grokData.model,
          response: aiResponse,
          tokens_used: grokData.usage?.total_tokens || 0,
          api_endpoint: 'https://api.x.ai/v1/chat/completions'
        }
      };
    } else {
      const errorText = await grokResponse.text();
      return {
        status: 'error',
        message: `Grok API test failed: ${grokResponse.status}`,
        details: { error: errorText, status_code: grokResponse.status }
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Grok API connection error: ${error}`,
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
} 