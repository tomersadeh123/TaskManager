import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const SYSTEM_API_KEY = process.env.SYSTEM_API_KEY;

// Test endpoint to verify system API authentication and configuration
export async function GET(request: NextRequest) {
  try {
    // Check if system API key is configured
    if (!SYSTEM_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'System API key not configured',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Verify system API key from request
    const authHeader = request.headers.get('authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    
    if (!providedKey) {
      return NextResponse.json({
        success: false,
        message: 'No authorization header provided',
        expected: 'Bearer <SYSTEM_API_KEY>',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    if (providedKey !== SYSTEM_API_KEY) {
      logger.warn('System API test failed - invalid key', {
        providedKey: `${providedKey.slice(0, 8)}...`,
        ip: request.headers.get('x-forwarded-for')
      });
      
      return NextResponse.json({
        success: false,
        message: 'Invalid system API key',
        providedKeyPreview: `${providedKey.slice(0, 8)}...`,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Success response with environment info
    return NextResponse.json({
      success: true,
      message: 'System API authentication successful',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasMongoUri: !!process.env.MONGO_URI,
        hasSystemApiKey: !!SYSTEM_API_KEY,
        systemApiKeyPreview: `${SYSTEM_API_KEY.slice(0, 8)}...`
      },
      timestamp: new Date().toISOString(),
      serverInfo: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
      }
    });

  } catch (error) {
    logger.error('System API test error', error as Error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error during system API test',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for consistency with main endpoint
export async function POST(request: NextRequest) {
  return GET(request);
}