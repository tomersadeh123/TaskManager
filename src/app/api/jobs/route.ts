import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
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

// GET /api/jobs - Get all jobs for the authenticated user
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

    const url = new URL(request.url);
    const filter = url.searchParams.get('filter'); // 'applied', 'unapplied', 'recent'
    const source = url.searchParams.get('source'); // 'LinkedIn', 'Drushim.il'
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const page = parseInt(url.searchParams.get('page') || '1');

    const query: Record<string, unknown> = { user: user._id };

    // Apply filters
    if (filter === 'applied') {
      query.isApplied = true;
    } else if (filter === 'unapplied') {
      query.isApplied = false;
    } else if (filter === 'recent') {
      query.postingDays = { $lte: 3 };
    }

    if (source) {
      query.source = source;
    }

    // Get jobs with pagination
    const jobs = await Job.find(query)
      .sort({ 
        isApplied: 1, // Unapplied jobs first
        postingDays: 1, // Newer jobs first
        scrapedAt: -1 
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('user', 'userName email');

    // Get total count for pagination
    const totalJobs = await Job.countDocuments(query);

    // Get job statistics
    const stats = {
      totalJobs: await Job.countDocuments({ user: user._id }),
      appliedJobs: await Job.countDocuments({ user: user._id, isApplied: true }),
      newJobs: await Job.countDocuments({ user: user._id, postingDays: { $lte: 3 } }),
      linkedinJobs: await Job.countDocuments({ user: user._id, source: 'LinkedIn' }),
      drushimJobs: await Job.countDocuments({ user: user._id, source: 'Drushim.il' })
    };

    return NextResponse.json({
      success: true,
      result: {
        jobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalJobs / limit),
          totalJobs,
          hasNext: page < Math.ceil(totalJobs / limit),
          hasPrev: page > 1
        },
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Manually add a job (optional feature)
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
    const { title, company, location, url, description, source, searchKeyword } = body;

    // Validate required fields
    if (!title || !company || !url || !source) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if job already exists for this user
    const existingJob = await Job.findOne({
      title,
      company,
      user: user._id
    });

    if (existingJob) {
      return NextResponse.json(
        { success: false, message: 'Job already exists' },
        { status: 400 }
      );
    }

    // Create new job
    const newJob = await Job.create({
      title,
      company,
      location: location || 'Israel',
      postingDate: 'Manual Entry',
      postingDays: 0,
      source,
      url,
      description: description || '',
      searchKeyword: searchKeyword || 'Manual',
      user: user._id,
      scrapedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      result: newJob,
      message: 'Job added successfully'
    });

  } catch (error) {
    console.error('Error adding job:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add job' },
      { status: 500 }
    );
  }
}