import { NextRequest } from 'next/server';

export async function logRequest(request: NextRequest, body?: Record<string, unknown>) {
  const method = request.method;
  const url = request.nextUrl.pathname;
  
  console.log(`Request received: ${method} ${url}`, body || '');
}

// Wrapper for API route handlers that includes logging
export function withLogging(handler: (request: NextRequest, context?: { params: Record<string, string> }) => Promise<Response>) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    let body;
    
    // Only try to parse body for POST/PUT requests
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        body = await request.clone().json();
      } catch {
        // Body might not be JSON, that's okay
      }
    }
    
    logRequest(request, body);
    
    return handler(request, context);
  };
}