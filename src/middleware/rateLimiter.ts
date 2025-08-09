import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function createRateLimit(config: RateLimitConfig) {
  const { windowMs, max, skipSuccessfulRequests = false } = config;

  return {
    check: (request: NextRequest): { success: boolean; response?: NextResponse } => {
      // Get client IP (considering proxies)
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      
      const key = `${ip}:${request.nextUrl.pathname}`;
      const now = Date.now();
      
      // Clean up expired entries
      if (rateLimitStore.size > 1000) {
        for (const [k, v] of rateLimitStore.entries()) {
          if (v.resetTime < now) {
            rateLimitStore.delete(k);
          }
        }
      }
      
      let entry = rateLimitStore.get(key);
      
      if (!entry || entry.resetTime < now) {
        entry = { count: 0, resetTime: now + windowMs };
        rateLimitStore.set(key, entry);
      }
      
      entry.count += 1;
      
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        return {
          success: false,
          response: new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': max.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': entry.resetTime.toString(),
              },
            }
          ),
        };
      }
      
      return { success: true };
    },
    
    // Method to manually decrement count for successful requests
    decrement: (request: NextRequest): void => {
      if (!skipSuccessfulRequests) return;
      
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      
      const key = `${ip}:${request.nextUrl.pathname}`;
      const entry = rateLimitStore.get(key);
      
      if (entry && entry.count > 0) {
        entry.count -= 1;
      }
    }
  };
}

// Pre-configured rate limiters
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true
});

export const generalApiRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

export const scrapeRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 scraping requests per 5 minutes
});

/**
 * Helper function to apply rate limiting to API routes
 */
export async function withRateLimit<T>(
  request: NextRequest,
  rateLimiter: ReturnType<typeof createRateLimit>,
  handler: () => Promise<T> | T
): Promise<T | NextResponse> {
  const result = rateLimiter.check(request);
  
  if (!result.success) {
    return result.response!;
  }
  
  try {
    const response = await handler();
    
    // If it's a successful response and we want to skip successful requests
    // The decrement will be handled automatically
    
    return response;
  } catch (error) {
    // Don't decrement on errors
    throw error;
  }
}