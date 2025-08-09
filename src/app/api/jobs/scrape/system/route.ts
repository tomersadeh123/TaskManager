import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { JobScraperService, defaultSearchConfig } from '@/services/jobScraperService';
import { LinkedInCredentialsService } from '@/services/linkedinCredentialsService';
import { logger } from '@/lib/logger';

const SYSTEM_API_KEY = process.env.SYSTEM_API_KEY;

// System endpoint for scheduled job scraping - scrapes for all users with LinkedIn credentials
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    await connectDB();
    
    // Verify system API key
    const authHeader = request.headers.get('authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    
    if (!SYSTEM_API_KEY || !providedKey || providedKey !== SYSTEM_API_KEY) {
      logger.warn('Unauthorized system API access attempt', {
        providedKey: providedKey ? `${providedKey.slice(0, 4)}...` : null,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      });
      
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('System job scraping initiated', {
      trigger: 'scheduled',
      timestamp: new Date().toISOString()
    });

    // Find all users with LinkedIn credentials
    const usersWithLinkedIn = await User.find({
      'linkedinAuth.isConnected': true,
      'linkedinAuth.loginStatus': 'active'
    }).select('_id userName email linkedinAuth linkedinJobPreferences');

    logger.info('Found users for scraping', {
      userCount: usersWithLinkedIn.length,
      usersWithCredentials: usersWithLinkedIn.length
    });

    if (usersWithLinkedIn.length === 0) {
      return NextResponse.json({
        success: true,
        result: {
          message: 'No users with LinkedIn credentials found',
          userCount: 0,
          totalJobs: 0,
          summary: []
        }
      });
    }

    const scraper = new JobScraperService();
    const results = [];
    let totalNewJobs = 0;
    
    // Process each user (with delay to avoid overwhelming the system)
    for (const user of usersWithLinkedIn) {
      try {
        logger.info('Processing user for scheduled scraping', {
          userId: user._id,
          userName: user.userName
        });

        // Use user's custom search config or default
        let searchConfig = defaultSearchConfig;
        
        if (user.linkedinJobPreferences?.keywords && user.linkedinJobPreferences.keywords.length > 0) {
          // Enhance config with user preferences
          searchConfig = {
            linkedin: user.linkedinJobPreferences.keywords.map((keyword: string) => `${keyword} Israel`),
            drushim: user.linkedinJobPreferences.keywords.map((keyword: string) => ({
              position: keyword,
              experience: '0-5'  // Default experience range
            }))
          };
        }

        const result = await scraper.scrapeJobsForUser(user._id.toString(), searchConfig);
        
        results.push({
          userId: user._id,
          userName: user.userName,
          success: result.success,
          jobCount: result.jobCount,
          error: result.error || null
        });

        totalNewJobs += result.jobCount;
        
        logger.info('User scraping completed', {
          userId: user._id,
          userName: user.userName,
          success: result.success,
          jobCount: result.jobCount
        });

        // Small delay between users to avoid overwhelming external APIs
        if (usersWithLinkedIn.indexOf(user) < usersWithLinkedIn.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

      } catch (userError) {
        logger.error('User scraping failed', userError as Error, {
          userId: user._id,
          userName: user.userName
        });
        
        results.push({
          userId: user._id,
          userName: user.userName,
          success: false,
          jobCount: 0,
          error: (userError as Error).message
        });
      }
    }

    const duration = Date.now() - startTime;
    const successfulUsers = results.filter(r => r.success).length;
    const failedUsers = results.filter(r => !r.success).length;

    logger.info('System job scraping completed', {
      totalUsers: usersWithLinkedIn.length,
      successfulUsers,
      failedUsers,
      totalNewJobs,
      duration: `${duration}ms`
    });

    return NextResponse.json({
      success: true,
      result: {
        message: `Scraping completed for ${usersWithLinkedIn.length} users`,
        userCount: usersWithLinkedIn.length,
        successfulUsers,
        failedUsers,
        totalJobs: totalNewJobs,
        duration: `${duration}ms`,
        summary: results.map(r => ({
          userName: r.userName,
          success: r.success,
          jobCount: r.jobCount,
          error: r.error
        }))
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('System job scraping failed', error as Error, {
      duration: `${duration}ms`
    });
    
    return NextResponse.json(
      { success: false, message: 'System job scraping failed' },
      { status: 500 }
    );
  }
}