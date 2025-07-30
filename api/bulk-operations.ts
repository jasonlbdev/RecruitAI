import { VercelRequest, VercelResponse } from '@vercel/node';

interface BulkOperation {
  type: 'update_status' | 'delete' | 'export' | 'assign' | 'send_email';
  entityType: 'candidates' | 'jobs' | 'applications';
  entityIds: string[];
  params: Record<string, any>;
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
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'POST') {
      const { type, entityType, entityIds, params } = req.body as BulkOperation;

      if (!entityIds || entityIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No entities selected for bulk operation'
        });
      }

      let results: any[] = [];

      switch (type) {
        case 'update_status':
          results = await bulkUpdateStatus(sql, entityType, entityIds, params);
          break;
        case 'delete':
          results = await bulkDelete(sql, entityType, entityIds);
          break;
        case 'export':
          results = await bulkExport(sql, entityType, entityIds);
          break;
        case 'assign':
          results = await bulkAssign(sql, entityType, entityIds, params);
          break;
        case 'send_email':
          results = await bulkSendEmail(sql, entityType, entityIds, params);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid operation type'
          });
      }

      return res.status(200).json({
        success: true,
        data: {
          operation: type,
          entityType,
          totalProcessed: entityIds.length,
          results
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Bulk operations error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

async function bulkUpdateStatus(sql: any, entityType: string, entityIds: string[], params: any) {
  const { status } = params;
  const results = [];

  for (const id of entityIds) {
    try {
      if (entityType === 'applications') {
        await sql`
          UPDATE applications 
          SET status = ${status}, updated_at = NOW()
          WHERE id = ${id}
        `;
      } else if (entityType === 'jobs') {
        await sql`
          UPDATE jobs 
          SET is_active = ${status === 'active'}, updated_at = NOW()
          WHERE id = ${id}
        `;
      }
      results.push({ id, success: true });
    } catch (error) {
      results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
}

async function bulkDelete(sql: any, entityType: string, entityIds: string[]) {
  const results = [];

  for (const id of entityIds) {
    try {
      if (entityType === 'candidates') {
        await sql`DELETE FROM candidates WHERE id = ${id}`;
      } else if (entityType === 'jobs') {
        await sql`DELETE FROM jobs WHERE id = ${id}`;
      } else if (entityType === 'applications') {
        await sql`DELETE FROM applications WHERE id = ${id}`;
      }
      results.push({ id, success: true });
    } catch (error) {
      results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
}

async function bulkExport(sql: any, entityType: string, entityIds: string[]) {
  const results = [];

  for (const id of entityIds) {
    try {
      let data;
      if (entityType === 'candidates') {
        [data] = await sql`SELECT * FROM candidates WHERE id = ${id}`;
      } else if (entityType === 'jobs') {
        [data] = await sql`SELECT * FROM jobs WHERE id = ${id}`;
      } else if (entityType === 'applications') {
        [data] = await sql`SELECT * FROM applications WHERE id = ${id}`;
      }
      results.push({ id, success: true, data });
    } catch (error) {
      results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
}

async function bulkAssign(sql: any, entityType: string, entityIds: string[], params: any) {
  const { assignedTo } = params;
  const results = [];

  for (const id of entityIds) {
    try {
      if (entityType === 'applications') {
        await sql`
          UPDATE applications 
          SET assigned_to = ${assignedTo}, updated_at = NOW()
          WHERE id = ${id}
        `;
      }
      results.push({ id, success: true });
    } catch (error) {
      results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
}

async function bulkSendEmail(sql: any, entityType: string, entityIds: string[], params: any) {
  const { templateId, variables } = params;
  const results = [];

  for (const id of entityIds) {
    try {
      let email;
      if (entityType === 'candidates') {
        const [candidate] = await sql`SELECT email FROM candidates WHERE id = ${id}`;
        email = candidate?.email;
      } else if (entityType === 'applications') {
        const [application] = await sql`
          SELECT c.email 
          FROM applications a 
          JOIN candidates c ON a.candidate_id = c.id 
          WHERE a.id = ${id}
        `;
        email = application?.email;
      }

      if (email) {
        // Send email
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId,
            to: email,
            variables: { ...variables, entity_id: id }
          })
        });
        results.push({ id, success: true, email });
      } else {
        results.push({ id, success: false, error: 'No email found' });
      }
    } catch (error) {
      results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
} 