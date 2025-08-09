import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { LinkedInCredentialsService } from '@/services/linkedinCredentialsService';
import { requireAuth, getUserId } from '@/middleware/auth';
import { withRateLimit, scrapeRateLimit } from '@/middleware/rateLimiter';
import { validateLinkedInCredentials } from '@/lib/UserValidations';
import { logger } from '@/lib/logger';

// POST /api/auth/linkedin/credentials - Store LinkedIn credentials
export async function POST(request: NextRequest) {
  return withRateLimit(request, scrapeRateLimit, () =>
    requireAuth(async (authRequest) => {
      try {
        await connectDB();
        
        const userId = getUserId(authRequest);
        const requestBody = await request.json();
        
        // Validate input
        const validation = validateLinkedInCredentials(requestBody);
        if (!validation.isValid) {
          logger.warn('LinkedIn credentials validation failed', {
            userId,
            errors: validation.errors
          });
          
          return NextResponse.json(
            { 
              success: false,
              message: 'Invalid credentials format',
              errors: validation.errors
            },
            { status: 400 }
          );
        }
        
        const { email, password } = validation.sanitizedData!;

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
    })(request)
  );
}

// GET /api/auth/linkedin/credentials - Get LinkedIn connection status
export async function GET(request: NextRequest) {
  return requireAuth(async (authRequest) => {
    try {
      await connectDB();

      const userId = getUserId(authRequest);

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
  })(request);
}

// DELETE /api/auth/linkedin/credentials - Remove LinkedIn credentials
export async function DELETE(request: NextRequest) {
  return requireAuth(async (authRequest) => {
    try {
      await connectDB();

      const userId = getUserId(authRequest);

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
  })(request);
}