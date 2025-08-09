import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
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

// PUT /api/jobs/[id] - Mark job as applied or update job details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const body = await request.json();
    const { isApplied, notes } = body;

    // Find job and verify ownership
    const job = await Job.findOne({ _id: jobId, user: user._id });
    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    // Update job application status
    const updateData: Record<string, unknown> = {};
    
    if (typeof isApplied === 'boolean') {
      updateData.isApplied = isApplied;
      
      if (isApplied) {
        updateData.appliedBy = user._id;
        updateData.appliedDate = new Date();
      } else {
        updateData.appliedBy = null;
        updateData.appliedDate = null;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      updateData,
      { new: true }
    ).populate('user', 'userName email');

    return NextResponse.json({
      success: true,
      result: updatedJob,
      message: isApplied ? 'Job marked as applied' : 'Job updated successfully'
    });

  } catch (error) {
    logger.error('Job update API failed', error as Error);
    return NextResponse.json(
      { success: false, message: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Delete a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // Find and soft delete job, verify ownership
    const deletedJob = await Job.findOneAndUpdate(
      { 
        _id: jobId, 
        user: user._id,
        isDeleted: { $ne: true } // Only delete if not already deleted
      },
      {
        isDeleted: true,
        deletedDate: new Date()
      },
      { new: true }
    );

    if (!deletedJob) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    logger.info('Job soft deleted successfully', {
      userId: user._id,
      userName: user.userName,
      jobId,
      jobTitle: deletedJob.title,
      jobCompany: deletedJob.company
    });

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    logger.error('Job soft delete API failed', error as Error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete job' },
      { status: 500 }
    );
  }
}

// GET /api/jobs/[id] - Get a specific job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // Find job and verify ownership
    const job = await Job.findOne({ _id: jobId, user: user._id })
      .populate('user', 'userName email')
      .populate('appliedBy', 'userName email');

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      result: job
    });

  } catch (error) {
    logger.error('Single job fetch API failed', error as Error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}