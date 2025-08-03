import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chore from '@/models/Chore';
import User from '@/models/User';
import { verifyToken } from '@/utils/jwt';

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const assignedTo = url.searchParams.get('assignedTo');
    const days = url.searchParams.get('days'); // How many days overdue

    const query: Record<string, unknown> = {
      nextDue: { $lt: new Date() },
      isActive: true
    };

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      query.nextDue = {
        $lt: new Date(),
        $gte: daysAgo
      };
    }

    const overdueChores = await Chore.find(query)
      .populate('assignedTo', 'userName')
      .sort({ nextDue: 1 }); // Oldest overdue first

    // Calculate how many days overdue each chore is
    const choresWithOverdueDays = overdueChores.map(chore => {
      const now = new Date();
      const dueDate = new Date(chore.nextDue);
      const overdueDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...chore.toJSON(),
        overdueDays
      };
    });

    return NextResponse.json({ 
      result: choresWithOverdueDays,
      total: choresWithOverdueDays.length
    });
  } catch (error) {
    console.error('Error fetching overdue chores:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}