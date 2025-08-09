import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import jwt from 'jsonwebtoken';
import { LinkedInOAuthService } from '@/services/linkedinOAuthService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/auth/linkedin/disconnect - Disconnect LinkedIn account
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get user from token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
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

    // Disconnect LinkedIn account
    const disconnected = await LinkedInOAuthService.disconnectLinkedIn(decoded.userId);
    
    if (!disconnected) {
      return NextResponse.json(
        { success: false, message: 'Failed to disconnect LinkedIn account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'LinkedIn account disconnected successfully'
    });

  } catch (error) {
    console.error('LinkedIn disconnect error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to disconnect LinkedIn account' },
      { status: 500 }
    );
  }
}