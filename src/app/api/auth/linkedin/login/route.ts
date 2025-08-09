import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { LinkedInOAuthService } from '@/services/linkedinOAuthService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET /api/auth/linkedin/login - Initiate LinkedIn OAuth flow
export async function GET(request: NextRequest) {
  try {
    // Get user from token to ensure they're authenticated
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                  request.nextUrl.searchParams.get('token');
                  
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Generate state parameter with user ID for security
    const state = Buffer.from(JSON.stringify({
      userId: decoded.userId,
      timestamp: Date.now()
    })).toString('base64');

    // Get LinkedIn authorization URL
    const authUrl = LinkedInOAuthService.getAuthorizationUrl(state);

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'LinkedIn authorization URL generated'
    });

  } catch (error) {
    console.error('LinkedIn login initiation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initiate LinkedIn login' },
      { status: 500 }
    );
  }
}