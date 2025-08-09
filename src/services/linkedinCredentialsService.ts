import crypto from 'crypto';
import User from '@/models/User';

// Encryption utilities for LinkedIn credentials
const ENCRYPTION_KEY = process.env.LINKEDIN_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export class LinkedInCredentialsService {
  /**
   * Encrypt sensitive LinkedIn credentials before storing in database
   */
  private static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt LinkedIn credentials when retrieving from database
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
   * Store LinkedIn credentials for a user
   */
  static async storeLinkedInCredentials(userId: string, credentials: {
    email: string;
    password: string;
  }): Promise<boolean> {
    try {
      const encryptedEmail = this.encrypt(credentials.email);
      const encryptedPassword = this.encrypt(credentials.password);

      await User.findByIdAndUpdate(userId, {
        'linkedinAuth.isConnected': true,
        'linkedinAuth.email': encryptedEmail,
        'linkedinAuth.password': encryptedPassword,
        'linkedinAuth.connectedAt': new Date(),
        'linkedinAuth.loginStatus': 'active'
      });

      return true;
    } catch (error) {
      console.error('Error storing LinkedIn credentials:', error);
      return false;
    }
  }

  /**
   * Get decrypted LinkedIn credentials for a user
   */
  static async getLinkedInCredentials(userId: string): Promise<{
    email: string;
    password: string;
  } | null> {
    try {
      const user = await User.findById(userId);
      if (!user?.linkedinAuth?.isConnected || !user.linkedinAuth.email || !user.linkedinAuth.password) {
        return null;
      }

      // Check if credentials are still valid
      if (user.linkedinAuth.loginStatus === 'invalid' || user.linkedinAuth.loginStatus === 'locked') {
        return null;
      }

      return {
        email: this.decrypt(user.linkedinAuth.email),
        password: this.decrypt(user.linkedinAuth.password)
      };
    } catch (error) {
      console.error('Error getting LinkedIn credentials:', error);
      return null;
    }
  }

  /**
   * Update LinkedIn login status
   */
  static async updateLoginStatus(userId: string, status: 'active' | 'expired' | 'invalid' | 'locked', profileData?: {
    firstName?: string;
    lastName?: string;
    headline?: string;
    profilePicture?: string;
    location?: string;
    industry?: string;
  }): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        'linkedinAuth.loginStatus': status
      };

      if (status === 'active') {
        updateData['linkedinAuth.lastLoginAt'] = new Date();
        
        if (profileData) {
          updateData['linkedinAuth.profileData'] = {
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || '',
            headline: profileData.headline || '',
            profilePicture: profileData.profilePicture || '',
            location: profileData.location || '',
            industry: profileData.industry || ''
          };
        }
      }

      await User.findByIdAndUpdate(userId, updateData);
      return true;
    } catch (error) {
      console.error('Error updating LinkedIn login status:', error);
      return false;
    }
  }

  /**
   * Remove LinkedIn credentials for a user
   */
  static async removeLinkedInCredentials(userId: string): Promise<boolean> {
    try {
      await User.findByIdAndUpdate(userId, {
        'linkedinAuth.isConnected': false,
        'linkedinAuth.email': null,
        'linkedinAuth.password': null,
        'linkedinAuth.loginStatus': 'active',
        'linkedinAuth.profileData': null
      });

      return true;
    } catch (error) {
      console.error('Error removing LinkedIn credentials:', error);
      return false;
    }
  }

  /**
   * Check if user has LinkedIn credentials stored
   */
  static async hasLinkedInCredentials(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      return !!(user?.linkedinAuth?.isConnected && 
                user.linkedinAuth.email && 
                user.linkedinAuth.password &&
                user.linkedinAuth.loginStatus !== 'invalid' &&
                user.linkedinAuth.loginStatus !== 'locked');
    } catch (error) {
      console.error('Error checking LinkedIn credentials:', error);
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
    industry: string;
    connectedAt?: Date;
    loginStatus: string;
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
        industry: user.linkedinAuth.profileData.industry || '',
        connectedAt: user.linkedinAuth.connectedAt,
        loginStatus: user.linkedinAuth.loginStatus || 'active'
      };
    } catch (error) {
      console.error('Error getting LinkedIn profile:', error);
      return null;
    }
  }

  /**
   * Test LinkedIn credentials by attempting login
   * This is a placeholder - in a real implementation, you'd test actual login
   */
  static async testLinkedInCredentials(email: string, password: string): Promise<{
    valid: boolean;
    profileData?: {
      firstName: string;
      lastName: string;
      headline: string;
      profilePicture: string;
      location: string;
      industry: string;
    };
    error?: string;
  }> {
    // In a real implementation, you would:
    // 1. Use Puppeteer/Playwright to test login
    // 2. Scrape basic profile info after successful login
    // 3. Return validation result
    
    // For now, we'll do basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        error: 'Invalid email format'
      };
    }

    if (password.length < 6) {
      return {
        valid: false,
        error: 'Password too short'
      };
    }

    // Simulate successful validation
    // In production, replace this with actual LinkedIn login test
    return {
      valid: true,
      profileData: {
        firstName: email.split('@')[0].split('.')[0] || 'User',
        lastName: email.split('@')[0].split('.')[1] || '',
        headline: 'Professional',
        profilePicture: '',
        location: 'Israel',
        industry: 'Technology'
      }
    };
  }
}