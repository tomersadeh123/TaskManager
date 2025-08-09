import crypto from 'crypto';
import User from '@/models/User';

// Encryption utilities for LinkedIn tokens
const ENCRYPTION_KEY = process.env.LINKEDIN_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export class LinkedInOAuthService {
  /**
   * Encrypt sensitive LinkedIn tokens before storing in database
   */
  private static encrypt(text: string): string {
    const _iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return _iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt LinkedIn tokens when retrieving from database
   */
  private static decrypt(text: string): string {
    const parts = text.split(':');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get LinkedIn OAuth authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    const scope = 'r_liteprofile r_emailaddress';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId!,
      redirect_uri: redirectUri!,
      state,
      scope
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  } | null> {
    try {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri!,
        }),
      });

      if (!response.ok) {
        console.error('LinkedIn token exchange failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error exchanging LinkedIn code for token:', error);
      return null;
    }
  }

  /**
   * Get LinkedIn user profile information
   */
  static async getUserProfile(accessToken: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    headline?: string;
    profilePicture?: string;
    location?: string;
  } | null> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams))', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('LinkedIn profile fetch failed:', response.statusText);
        return null;
      }

      const profile = await response.json();
      
      return {
        id: profile.id,
        firstName: profile.firstName?.localized?.en_US || '',
        lastName: profile.lastName?.localized?.en_US || '',
        headline: profile.headline?.localized?.en_US || '',
        profilePicture: profile.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier || '',
        location: profile.location?.name || ''
      };
    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error);
      return null;
    }
  }

  /**
   * Store LinkedIn OAuth data for a user
   */
  static async storeLinkedInAuth(userId: string, tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }, profileData: {
    id: string;
    firstName: string;
    lastName: string;
    headline?: string;
    profilePicture?: string;
    location?: string;
  }): Promise<boolean> {
    try {
      const encryptedAccessToken = this.encrypt(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token ? this.encrypt(tokenData.refresh_token) : undefined;
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      await User.findByIdAndUpdate(userId, {
        'linkedinAuth.isConnected': true,
        'linkedinAuth.accessToken': encryptedAccessToken,
        'linkedinAuth.refreshToken': encryptedRefreshToken,
        'linkedinAuth.profileId': profileData.id,
        'linkedinAuth.expiresAt': expiresAt,
        'linkedinAuth.connectedAt': new Date(),
        'linkedinAuth.lastSyncAt': new Date(),
        'linkedinAuth.profileData': {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          headline: profileData.headline || '',
          profilePicture: profileData.profilePicture || '',
          location: profileData.location || ''
        }
      });

      return true;
    } catch (error) {
      console.error('Error storing LinkedIn auth data:', error);
      return false;
    }
  }

  /**
   * Get decrypted LinkedIn access token for a user
   */
  static async getLinkedInAccessToken(userId: string): Promise<string | null> {
    try {
      const user = await User.findById(userId);
      if (!user?.linkedinAuth?.isConnected || !user.linkedinAuth.accessToken) {
        return null;
      }

      // Check if token is expired
      if (user.linkedinAuth.expiresAt && user.linkedinAuth.expiresAt < new Date()) {
        console.log('LinkedIn token expired for user:', userId);
        // TODO: Implement token refresh logic
        return null;
      }

      return this.decrypt(user.linkedinAuth.accessToken);
    } catch (error) {
      console.error('Error getting LinkedIn access token:', error);
      return null;
    }
  }

  /**
   * Disconnect LinkedIn account for a user
   */
  static async disconnectLinkedIn(userId: string): Promise<boolean> {
    try {
      await User.findByIdAndUpdate(userId, {
        'linkedinAuth.isConnected': false,
        'linkedinAuth.accessToken': null,
        'linkedinAuth.refreshToken': null,
        'linkedinAuth.profileId': null,
        'linkedinAuth.expiresAt': null,
        'linkedinAuth.profileData': null
      });

      return true;
    } catch (error) {
      console.error('Error disconnecting LinkedIn:', error);
      return false;
    }
  }

  /**
   * Check if user has connected LinkedIn account
   */
  static async isLinkedInConnected(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      return user?.linkedinAuth?.isConnected || false;
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
      return false;
    }
  }

  /**
   * Get user's LinkedIn profile data
   */
  static async getLinkedInProfile(userId: string): Promise<{
    firstName: string;
    lastName: string;
    headline: string;
    profilePicture: string;
    location: string;
    connectedAt?: Date;
  } | null> {
    try {
      const user = await User.findById(userId);
      if (!user?.linkedinAuth?.isConnected || !user.linkedinAuth.profileData) {
        return null;
      }

      return {
        firstName: user.linkedinAuth.profileData.firstName || '',
        lastName: user.linkedinAuth.profileData.lastName || '',
        headline: user.linkedinAuth.profileData.headline || '',
        profilePicture: user.linkedinAuth.profileData.profilePicture || '',
        location: user.linkedinAuth.profileData.location || '',
        connectedAt: user.linkedinAuth.connectedAt
      };
    } catch (error) {
      console.error('Error getting LinkedIn profile:', error);
      return null;
    }
  }
}