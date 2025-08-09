import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chore from '@/models/Chore';
import User from '@/models/User';
import { verifyToken } from '@/utils/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { userId: targetUserId } = await params;
    const url = new URL(request.url);
    const status = url.searchParams.get('status'); // active, overdue, completed
    const limit = url.searchParams.get('limit');

    const query: Record<string, unknown> = { 
      assignedTo: targetUserId,
      isActive: true 
    };

    // Filter by status
    if (status === 'overdue') {
      query.nextDue = { $lt: new Date() };
    } else if (status === 'completed') {
      query.lastCompleted = { $exists: true };
      query.lastCompleted = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }; // Last 7 days
    } else if (status === 'due_today') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.nextDue = {
        $gte: today.setHours(0, 0, 0, 0),
        $lt: tomorrow.setHours(0, 0, 0, 0)
      };
    }

    let choreQuery = Chore.find(query)
      .populate('assignedTo', 'userName')
      .sort({ nextDue: 1 });

    if (limit) {
      choreQuery = choreQuery.limit(parseInt(limit));
    }

    const chores = await choreQuery;

    return NextResponse.json({ 
      result: chores,
      total: chores.length
    });
  } catch (error) {
    console.error('Error fetching assigned chores:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}