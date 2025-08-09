import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { LinkedInOAuthService } from '@/services/linkedinOAuthService';

// GET /api/auth/linkedin/callback - Handle LinkedIn OAuth callback
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error (user denied access)
    if (error) {
      const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('linkedin_error', error);
      redirectUrl.searchParams.set('linkedin_message', 'LinkedIn connection was cancelled');
      return NextResponse.redirect(redirectUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('linkedin_error', 'missing_params');
      redirectUrl.searchParams.set('linkedin_message', 'Invalid LinkedIn callback parameters');
      return NextResponse.redirect(redirectUrl);
    }

    // Decode and validate state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('linkedin_error', 'invalid_state');
      redirectUrl.searchParams.set('linkedin_message', 'Invalid LinkedIn state parameter');
      return NextResponse.redirect(redirectUrl);
    }

    const { userId, timestamp } = stateData;

    // Check if state is not too old (prevent replay attacks)
    if (Date.now() - timestamp > 10 * 60 * 1000) { // 10 minutes
      const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('linkedin_error', 'expired_state');
      redirectUrl.searchParams.set('linkedin_message', 'LinkedIn authorization expired, please try again');
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange authorization code for access token
    const tokenData = await LinkedInOAuthService.exchangeCodeForToken(code);
    if (!tokenData) {
      const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('linkedin_error', 'token_exchange_failed');
      redirectUrl.searchParams.set('linkedin_message', 'Failed to get LinkedIn access token');
      return NextResponse.redirect(redirectUrl);
    }

    // Get LinkedIn user profile
    const profileData = await LinkedInOAuthService.getUserProfile(tokenData.access_token);
    if (!profileData) {
      const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('linkedin_error', 'profile_fetch_failed');
      redirectUrl.searchParams.set('linkedin_message', 'Failed to get LinkedIn profile information');
      return NextResponse.redirect(redirectUrl);
    }

    // Store LinkedIn OAuth data
    const stored = await LinkedInOAuthService.storeLinkedInAuth(userId, tokenData, profileData);
    if (!stored) {
      const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
      redirectUrl.searchParams.set('linkedin_error', 'storage_failed');
      redirectUrl.searchParams.set('linkedin_message', 'Failed to save LinkedIn connection');
      return NextResponse.redirect(redirectUrl);
    }

    // Success - redirect to profile with success message
    const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('linkedin_success', 'true');
    redirectUrl.searchParams.set('linkedin_message', `Successfully connected LinkedIn account for ${profileData.firstName} ${profileData.lastName}`);
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('LinkedIn callback error:', error);
    const redirectUrl = new URL('/profile', process.env.APP_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('linkedin_error', 'server_error');
    redirectUrl.searchParams.set('linkedin_message', 'An error occurred while connecting LinkedIn');
    return NextResponse.redirect(redirectUrl);
  }
}