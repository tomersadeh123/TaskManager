import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaintenanceItem from '@/models/MaintenanceItem';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// GET /api/maintenance - Get Maintenance Items
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Parse token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status'); // pending, in_progress, completed, overdue
    const priority = url.searchParams.get('priority');
    const category = url.searchParams.get('category');
    const limit = url.searchParams.get('limit');

    const query: Record<string, unknown> = { user: user._id };
    
    if (status === 'overdue') {
      query.status = { $in: ['pending', 'in_progress'] };
      query.scheduledDate = { $lt: new Date() };
    } else if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (category) {
      query.category = category;
    }

    let maintenanceQuery = MaintenanceItem.find(query)
      .sort({ scheduledDate: 1, priority: -1 });

    if (limit) {
      maintenanceQuery = maintenanceQuery.limit(parseInt(limit));
    }

    const maintenanceItems = await maintenanceQuery;

    // Add computed fields
    const itemsWithStatus = maintenanceItems.map(item => {
      const now = new Date();
      const scheduledDate = new Date(item.scheduledDate);
      const isOverdue = ['pending', 'in_progress'].includes(item.status) && scheduledDate < now;
      const isDueSoon = ['pending', 'in_progress'].includes(item.status) && 
                       scheduledDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return {
        ...item.toJSON(),
        isOverdue,
        isDueSoon,
        daysUntilDue: Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      };
    });

    return NextResponse.json({ result: itemsWithStatus });
  } catch (error) {
    console.error('Error fetching maintenance items:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/maintenance - Create Maintenance Item
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Parse token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      category, 
      priority, 
      scheduledDate, 
      estimatedCost, 
      estimatedDuration,
      isRecurring,
      recurringInterval,
      assignedTo,
      notes
    } = body;

    // Validate required fields
    if (!title || !category || !scheduledDate) {
      return NextResponse.json(
        { message: 'Title, category, and scheduled date are required' },
        { status: 400 }
      );
    }

    const maintenanceData = {
      title,
      description: description || '',
      category,
      priority: priority || 'medium',
      scheduledDate: new Date(scheduledDate),
      estimatedCost: estimatedCost || 0,
      estimatedDuration: estimatedDuration || 60, // minutes
      isRecurring: isRecurring || false,
      recurringInterval: recurringInterval || 'yearly',
      assignedTo: assignedTo || user._id,
      notes: notes || '',
      status: 'pending',
      user: user._id
    };

    const newItem = await MaintenanceItem.create(maintenanceData);

    // If recurring, schedule next maintenance
    if (isRecurring) {
      const getNextScheduledDate = (interval: string, currentDate: Date) => {
        const nextDate = new Date(currentDate);
        switch (interval) {
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case 'semi_annually':
            nextDate.setMonth(nextDate.getMonth() + 6);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
          default:
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        return nextDate;
      };

      const nextScheduledDate = getNextScheduledDate(recurringInterval, new Date(scheduledDate));
      const nextMaintenanceData = {
        ...maintenanceData,
        scheduledDate: nextScheduledDate,
        status: 'pending'
      };

      await MaintenanceItem.create(nextMaintenanceData);
    }

    return NextResponse.json({ 
      message: 'Maintenance item created successfully',
      result: newItem 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance item:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}