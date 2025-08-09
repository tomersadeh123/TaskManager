import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import jwt from 'jsonwebtoken';
import { LinkedInCredentialsService } from '@/services/linkedinCredentialsService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET /api/auth/linkedin/status - Get LinkedIn connection status and profile
export async function GET(request: NextRequest) {
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

    // Check if credentials need updating (due to encryption format change)
    const credentialStatus = await LinkedInCredentialsService.needsCredentialUpdate(decoded.userId);
    
    if (credentialStatus.needsUpdate) {
      return NextResponse.json({
        success: true,
        result: {
          isConnected: false,
          needsUpdate: true,
          updateReason: credentialStatus.reason,
          profile: null
        }
      });
    }

    // Check LinkedIn connection status
    const isConnected = await LinkedInCredentialsService.hasLinkedInCredentials(decoded.userId);
    
    if (!isConnected) {
      return NextResponse.json({
        success: true,
        result: {
          isConnected: false,
          profile: null
        }
      });
    }

    // Get LinkedIn profile data
    const profile = await LinkedInCredentialsService.getLinkedInProfile(decoded.userId);

    return NextResponse.json({
      success: true,
      result: {
        isConnected: true,
        profile
      }
    });

  } catch (error) {
    console.error('LinkedIn status check error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check LinkedIn status' },
      { status: 500 }
    );
  }
}