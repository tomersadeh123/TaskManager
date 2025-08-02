import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Your original logging middleware functionality
  console.log('Request received:', request.method, request.nextUrl.pathname, 'headers:', request.headers.get('content-type'));
  
  // Continue to the next middleware or route handler
  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match dashboard routes (to ensure auth)
    '/dashboard/:path*'
  ]
};