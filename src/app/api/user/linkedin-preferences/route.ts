import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);
    return user;
  } catch {
    return null;
  }
}

// GET /api/user/linkedin-preferences - Get user's LinkedIn job preferences
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        preferences: user.linkedinJobPreferences || {
          keywords: [],
          locations: [],
          industries: [],
          experienceLevel: 'mid',
          jobTypes: [],
          remoteWork: false,
          salaryMin: null,
          salaryMax: null,
          companySize: [],
          updatedAt: new Date()
        },
        isLinkedInConnected: user.linkedinAuth?.isConnected || false
      }
    });

  } catch (error) {
    console.error('Error fetching LinkedIn preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch LinkedIn preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/user/linkedin-preferences - Update user's LinkedIn job preferences
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { preferences } = body;

    // Validate preferences structure
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid preferences data' },
        { status: 400 }
      );
    }

    // Update user's LinkedIn job preferences
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        'linkedinJobPreferences.keywords': preferences.keywords || [],
        'linkedinJobPreferences.locations': preferences.locations || [],
        'linkedinJobPreferences.industries': preferences.industries || [],
        'linkedinJobPreferences.experienceLevel': preferences.experienceLevel || 'mid',
        'linkedinJobPreferences.jobTypes': preferences.jobTypes || [],
        'linkedinJobPreferences.remoteWork': preferences.remoteWork || false,
        'linkedinJobPreferences.salaryMin': preferences.salaryMin || null,
        'linkedinJobPreferences.salaryMax': preferences.salaryMax || null,
        'linkedinJobPreferences.companySize': preferences.companySize || [],
        'linkedinJobPreferences.updatedAt': new Date()
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      result: {
        preferences: updatedUser?.linkedinJobPreferences,
        message: 'LinkedIn job preferences updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating LinkedIn preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update LinkedIn preferences' },
      { status: 500 }
    );
  }
}