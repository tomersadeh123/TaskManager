import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chore from '@/models/Chore';
import User from '@/models/User';
import { verifyToken } from '@/utils/jwt';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    logger.logRequest(request, requestId);
    
    // Parse token first
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      logger.logAuth('chores_access_failed', undefined, false, {
        reason: 'no_token',
        requestId
      });
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      logger.logAuth('chores_access_failed', undefined, false, {
        reason: 'invalid_token',
        requestId
      });
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Connect to database AFTER token validation
    await connectDB();

    const user = await User.findById(decoded.id);
    if (!user) {
      logger.logAuth('chores_access_failed', decoded.id, false, {
        reason: 'user_not_found',
        requestId
      });
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const assigned = url.searchParams.get('assigned');
    const overdue = url.searchParams.get('overdue');

    const query: Record<string, unknown> = {};
    
    if (assigned === 'true') {
      query.assignedTo = user._id;
    }
    
    if (overdue === 'true') {
      query.nextDue = { $lt: new Date() };
      query.isActive = true;
    }

    const dbStart = Date.now();
    const chores = await Chore.find(query)
      .populate('assignedTo', 'userName')
      .sort({ nextDue: 1 });
    const dbDuration = Date.now() - dbStart;

    logger.logDatabase('find', 'chores', dbDuration, undefined, { 
      userId: user._id,
      choreCount: chores.length,
      filters: { assigned, overdue }
    });
    
    const duration = Date.now() - startTime;
    logger.logBusinessEvent('chores_retrieved', user._id.toString(), 'chore', undefined, {
      choreCount: chores.length,
      overdueCount: chores.filter(c => new Date(c.nextDue) < new Date()).length,
      activeCount: chores.filter(c => c.isActive).length,
      filters: { assigned, overdue }
    });
    
    logger.logResponse(requestId, 200, duration, user._id.toString());

    return NextResponse.json({ result: chores });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error fetching chores', error as Error, { requestId, duration });
    logger.logResponse(requestId, 500, duration);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse token first
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Connect to database AFTER token validation
    await connectDB();

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, frequency, category, estimatedTime, priority, assignedTo } = body;

    // Validate required fields
    if (!title || !frequency || !category) {
      return NextResponse.json(
        { message: 'Title, frequency, and category are required' },
        { status: 400 }
      );
    }

    // Calculate next due date based on frequency
    const getNextDueDate = (frequency: string) => {
      const now = new Date();
      switch (frequency) {
        case 'daily':
          return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return nextMonth;
        case 'yearly':
          const nextYear = new Date(now);
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          return nextYear;
        case 'once':
          return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to tomorrow
        default:
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    };

    const choreData = {
      title,
      description: description || '',
      assignedTo: assignedTo || user._id,
      frequency,
      category,
      estimatedTime: estimatedTime || 30,
      priority: priority || 'medium',
      nextDue: getNextDueDate(frequency),
      isActive: true,
      createdBy: user._id
    };

    const newChore = new Chore(choreData);
    await newChore.save();

    // Populate the assignedTo field before returning
    await newChore.populate('assignedTo', 'userName');

    return NextResponse.json({ result: newChore }, { status: 201 });
  } catch (error) {
    console.error('Error creating chore:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}