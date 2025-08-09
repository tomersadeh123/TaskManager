import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { JobScraperService, defaultSearchConfig } from '@/services/jobScraperService';
import { logger } from '@/lib/logger';

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

// POST /api/jobs/scrape - Trigger job scraping for authenticated user
export async function POST(request: NextRequest) {
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
    const { searchConfig } = body;

    // Use provided search config or default
    const config = searchConfig || defaultSearchConfig;

    // Validate search config structure
    if (!config.linkedin || !config.drushim || 
        !Array.isArray(config.linkedin) || !Array.isArray(config.drushim)) {
      return NextResponse.json(
        { success: false, message: 'Invalid search configuration' },
        { status: 400 }
      );
    }

    logger.info('Job scraping API request initiated', { 
      userId: user._id, 
      userName: user.userName, 
      configType: searchConfig ? 'custom' : 'default',
      linkedinKeywords: config.linkedin.length,
      drushimSearches: config.drushim.length
    });

    // Initialize job scraper
    const scraper = new JobScraperService();

    // Start scraping process
    const result = await scraper.scrapeJobsForUser(user._id.toString(), config);

    if (result.success) {
      logger.info('Job scraping API completed successfully', {
        userId: user._id,
        userName: user.userName,
        newJobCount: result.jobCount,
        configUsed: config
      });
      
      return NextResponse.json({
        success: true,
        result: {
          jobCount: result.jobCount,
          message: `Successfully scraped ${result.jobCount} new jobs`,
          searchConfig: config
        }
      });
    } else {
      logger.error('Job scraping API failed', new Error(result.error || 'Unknown scraping error'), {
        userId: user._id,
        userName: user.userName,
        configUsed: config
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Job scraping failed: ${result.error}` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Job scraping API error', error as Error);
    return NextResponse.json(
      { success: false, message: 'Failed to start job scraping' },
      { status: 500 }
    );
  }
}

// GET /api/jobs/scrape - Get default search configuration
export async function GET(request: NextRequest) {
  try {
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
        defaultSearchConfig,
        linkedinConfigured: !!process.env.LINKEDIN_EMAIL,
        supportedSources: ['LinkedIn', 'Drushim.il']
      }
    });

  } catch (error) {
    logger.error('Scrape config fetch failed', error as Error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}