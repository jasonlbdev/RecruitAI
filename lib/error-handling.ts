export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
  }
}

export class DatabaseError extends Error {
  code = 'DATABASE_ERROR';
  
  constructor(message: string) {
    super(message);
  }
}

export class AIError extends Error {
  code = 'AI_ERROR';
  
  constructor(message: string) {
    super(message);
  }
}

export function createErrorResponse(error: any): AppError {
  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    details: error.details || null,
    timestamp: new Date().toISOString()
  };
}

export function handleAPIError(error: any) {
  console.error('API Error:', error);
  
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: 'Validation failed',
      details: error.details
    };
  }
  
  if (error instanceof DatabaseError) {
    return {
      success: false,
      error: 'Database operation failed',
      message: error.message
    };
  }
  
  if (error instanceof AIError) {
    return {
      success: false,
      error: 'AI service error',
      message: error.message
    };
  }
  
  return {
    success: false,
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred'
  };
} 