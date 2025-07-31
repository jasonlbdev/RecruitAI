import { VercelRequest, VercelResponse } from '@vercel/node';

interface ParsedResume {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { file } = req.body;

      if (!file || !file.data) {
        return res.status(400).json({
          success: false,
          error: 'No PDF file provided'
        });
      }

      // Dynamic import to avoid FUNCTION_INVOCATION_FAILED
      const pdf = (await import('pdf-parse')).default;

      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(file.data, 'base64');

      // Parse PDF
      const pdfData = await pdf(pdfBuffer);

      const parsedResume: ParsedResume = {
        text: pdfData.text,
        pageCount: pdfData.numpages,
        metadata: {
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate,
          modDate: pdfData.info?.ModDate
        }
      };

      return res.status(200).json({
        success: true,
        data: parsedResume
      });

    } catch (error) {
      console.error('PDF parsing error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse PDF'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 