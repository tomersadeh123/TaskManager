import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chore from '@/models/Chore';
import User from '@/models/User';
import { verifyToken } from '@/utils/jwt';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    logger.logRequest(request, requestId);

    // Parse token first
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      logger.logAuth('chore_completion_failed', undefined, false, {
        reason: 'no_token',
        requestId
      });
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      logger.logAuth('chore_completion_failed', undefined, false, {
        reason: 'invalid_token',
        requestId
      });
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Connect to database AFTER token validation
    await connectDB();

    const user = await User.findById(decoded.id);
    if (!user) {
      logger.logAuth('chore_completion_failed', decoded.id, false, {
        reason: 'user_not_found',
        requestId
      });
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: choreId } = await params;

    // Find the chore
    const dbStart = Date.now();
    const chore = await Chore.findById(choreId);
    const dbDuration = Date.now() - dbStart;
    
    if (!chore) {
      logger.warn('Chore completion failed - chore not found', {
        userId: user._id.toString(),
        choreId,
        dbDuration,
        requestId
      });
      
      const duration = Date.now() - startTime;
      logger.logResponse(requestId, 404, duration, user._id.toString());
      
      return NextResponse.json({ message: 'Chore not found' }, { status: 404 });
    }

    logger.logDatabase('findById', 'chores', dbDuration, undefined, { 
      choreId: chore._id,
      userId: user._id 
    });

    // Calculate next due date based on frequency
    const getNextDueDate = (frequency: string, currentDate: Date = new Date()) => {
      switch (frequency) {
        case 'daily':
          return new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
          return new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
          const nextMonth = new Date(currentDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return nextMonth;
        case 'yearly':
          const nextYear = new Date(currentDate);
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          return nextYear;
        case 'once':
          return null; // One-time chores become inactive after completion
        default:
          return new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    };

    const now = new Date();
    const nextDue = getNextDueDate(chore.frequency, now);
    const wasOverdue = new Date(chore.nextDue) < now;

    // Update the chore
    const updateData: Record<string, unknown> = {
      lastCompleted: now,
      updatedAt: now
    };

    if (nextDue) {
      updateData.nextDue = nextDue;
    } else {
      // For one-time chores, mark as inactive
      updateData.isActive = false;
    }

    const updateStart = Date.now();
    const updatedChore = await Chore.findByIdAndUpdate(
      choreId,
      updateData,
      { new: true }
    ).populate('assignedTo', 'userName');
    const updateDuration = Date.now() - updateStart;

    logger.logDatabase('findByIdAndUpdate', 'chores', updateDuration, undefined, { 
      choreId: updatedChore!._id,
      userId: user._id 
    });

    // Log the business event
    logger.logBusinessEvent('chore_completed', user._id.toString(), 'chore', choreId, {
      choreTitle: chore.title,
      frequency: chore.frequency,
      wasOverdue,
      daysOverdue: wasOverdue ? Math.ceil((now.getTime() - new Date(chore.nextDue).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      nextDue: nextDue?.toISOString(),
      completedBy: user.userName,
      assignedTo: chore.assignedTo?.toString(),
      isRecurring: chore.frequency !== 'once'
    });

    const duration = Date.now() - startTime;
    logger.logResponse(requestId, 200, duration, user._id.toString());

    return NextResponse.json({ 
      result: updatedChore,
      message: 'Chore marked as completed'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error completing chore', error as Error, { requestId, duration });
    logger.logResponse(requestId, 500, duration);
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}