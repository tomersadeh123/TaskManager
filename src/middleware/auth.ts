import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import { logger } from '@/lib/logger';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  user?: {
    id: string;
    userName: string;
  };
}

/**
 * Authentication middleware for API routes
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: (authenticatedRequest: AuthenticatedRequest) => Promise<T> | T,
  options: {
    required?: boolean;
    roles?: string[];
  } = { required: true }
): Promise<T | NextResponse> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    if (options.required) {
      logger.warn('Authentication failed: No token provided', {
        url: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      });
      
      return NextResponse.json(
        { 
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      );
    }
    
    // Token not required, continue without authentication
    return await handler(request as AuthenticatedRequest);
  }
  
  try {
    const decoded = verifyToken(token) as { userId: string; userName?: string; iat?: number; exp?: number };
    
    if (!decoded.userId) {
      throw new Error('Invalid token payload');
    }
    
    // Check token expiration (additional safety check)
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    // Attach user info to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.userId = decoded.userId;
    authenticatedRequest.user = {
      id: decoded.userId,
      userName: decoded.userName || 'unknown'
    };
    
    logger.info('Authentication successful', {
      userId: decoded.userId,
      url: request.nextUrl.pathname,
      tokenAge: decoded.iat ? Math.floor(Date.now() / 1000 - decoded.iat) : 'unknown'
    });
    
    return await handler(authenticatedRequest);
    
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: request.nextUrl.pathname,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      tokenLength: token.length
    });
    
    return NextResponse.json(
      { 
        message: 'Access denied. Invalid token.',
        code: 'INVALID_TOKEN'
      },
      { status: 401 }
    );
  }
}

/**
 * Middleware for routes that require authentication
 */
export function requireAuth<T>(
  handler: (request: AuthenticatedRequest) => Promise<T> | T
) {
  return (request: NextRequest) => withAuth(request, handler, { required: true });
}

/**
 * Middleware for routes where authentication is optional
 */
export function optionalAuth<T>(
  handler: (request: AuthenticatedRequest) => Promise<T> | T
) {
  return (request: NextRequest) => withAuth(request, handler, { required: false });
}

/**
 * Helper function to get user ID from authenticated request
 */
export function getUserId(request: AuthenticatedRequest): string {
  if (!request.userId) {
    throw new Error('Request is not authenticated');
  }
  return request.userId;
}

/**
 * Helper function to check if request is authenticated
 */
export function isAuthenticated(request: AuthenticatedRequest): boolean {
  return !!request.userId;
}