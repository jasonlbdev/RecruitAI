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
          error: 'No file provided'
        });
      }

      let parsedResume: ParsedResume;

      // Handle different file types
      if (file.name && file.name.toLowerCase().endsWith('.pdf')) {
        try {
          // Dynamic import to avoid FUNCTION_INVOCATION_FAILED
          const pdf = (await import('pdf-parse')).default;

          // Convert base64 to buffer
          const pdfBuffer = Buffer.from(file.data, 'base64');

          // Parse PDF
          const pdfData = await pdf(pdfBuffer);

          parsedResume = {
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
        } catch (pdfError) {
          console.error('PDF parsing failed, using fallback:', pdfError);
          // Fallback for PDF parsing errors
          parsedResume = {
            text: 'PDF content could not be parsed. Please check the file format.',
            pageCount: 1,
            metadata: {}
          };
        }
      } else {
        // Handle text files
        const textContent = Buffer.from(file.data, 'base64').toString('utf-8');
        parsedResume = {
          text: textContent,
          pageCount: 1,
          metadata: {}
        };
      }

      return res.status(200).json({
        success: true,
        data: parsedResume
      });

    } catch (error) {
      console.error('File parsing error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse file'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 