import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import jwt from 'jsonwebtoken';
import { LinkedInCredentialsService } from '@/services/linkedinCredentialsService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// POST /api/auth/linkedin/credentials - Store LinkedIn credentials
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Test credentials (basic validation)
    const validationResult = await LinkedInCredentialsService.testLinkedInCredentials(email, password);
    
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, message: validationResult.error || 'Invalid credentials' },
        { status: 400 }
      );
    }

    // Store credentials
    const stored = await LinkedInCredentialsService.storeLinkedInCredentials(userId, { email, password });
    
    if (!stored) {
      return NextResponse.json(
        { success: false, message: 'Failed to store LinkedIn credentials' },
        { status: 500 }
      );
    }

    // Update profile data if available
    if (validationResult.profileData) {
      await LinkedInCredentialsService.updateLoginStatus(userId, 'active', validationResult.profileData);
    }

    // Get updated profile
    const profile = await LinkedInCredentialsService.getLinkedInProfile(userId);

    return NextResponse.json({
      success: true,
      result: {
        message: 'LinkedIn credentials saved successfully',
        profile
      }
    });

  } catch (error) {
    console.error('LinkedIn credentials storage error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save LinkedIn credentials' },
      { status: 500 }
    );
  }
}

// GET /api/auth/linkedin/credentials - Get LinkedIn connection status
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has LinkedIn credentials
    const hasCredentials = await LinkedInCredentialsService.hasLinkedInCredentials(userId);
    
    if (!hasCredentials) {
      return NextResponse.json({
        success: true,
        result: {
          isConnected: false,
          profile: null
        }
      });
    }

    // Get LinkedIn profile data
    const profile = await LinkedInCredentialsService.getLinkedInProfile(userId);

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

// DELETE /api/auth/linkedin/credentials - Remove LinkedIn credentials
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Remove LinkedIn credentials
    const removed = await LinkedInCredentialsService.removeLinkedInCredentials(userId);
    
    if (!removed) {
      return NextResponse.json(
        { success: false, message: 'Failed to remove LinkedIn credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        message: 'LinkedIn credentials removed successfully'
      }
    });

  } catch (error) {
    console.error('LinkedIn credentials removal error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove LinkedIn credentials' },
      { status: 500 }
    );
  }
}