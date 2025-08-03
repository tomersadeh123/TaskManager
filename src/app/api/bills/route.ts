import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Bill from '@/models/Bill';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';
import { logger } from '@/lib/logger';

// GET /api/bills - Get Bills
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
    const status = url.searchParams.get('status'); // paid, unpaid, overdue, upcoming
    const limit = url.searchParams.get('limit');
    const category = url.searchParams.get('category');

    const query: Record<string, unknown> = { user: user._id };
    
    if (status === 'paid') {
      query.isPaid = true;
    } else if (status === 'unpaid') {
      query.isPaid = false;
    } else if (status === 'overdue') {
      query.isPaid = false;
      query.dueDate = { $lt: new Date() };
    } else if (status === 'upcoming') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      query.isPaid = false;
      query.dueDate = { 
        $gte: new Date(),
        $lte: nextWeek 
      };
    }

    if (category) {
      query.category = category;
    }

    let billQuery = Bill.find(query).sort({ dueDate: 1 });

    if (limit) {
      billQuery = billQuery.limit(parseInt(limit));
    }

    const bills = await billQuery;

    // Calculate additional information
    const billsWithStatus = bills.map(bill => {
      const now = new Date();
      const dueDate = new Date(bill.dueDate);
      const isOverdue = !bill.isPaid && dueDate < now;
      const isDueSoon = !bill.isPaid && dueDate <= new Date(now.getTime() + (bill.reminderDays || 3) * 24 * 60 * 60 * 1000);
      
      return {
        ...bill.toJSON(),
        isOverdue,
        isDueSoon,
        daysUntilDue: Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      };
    });

    return NextResponse.json({ result: billsWithStatus });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/bills - Create Bill
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
  
      // Parse bill data from request body
      const body = await request.json();
      const { name, amount, dueDate, category, isRecurring, frequency, reminderDays, notes, vendor } = body;

      // Validate required fields
      if (!name || !amount || !dueDate || !category) {
        return NextResponse.json(
          { message: 'Name, amount, due date, and category are required' },
          { status: 400 }
        );
      }

      const billData = {
        name,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        category,
        isRecurring: isRecurring || false,
        frequency: frequency || 'monthly',
        reminderDays: reminderDays || 3,
        notes: notes || '',
        vendor: vendor || '',
        isPaid: false,
        user: user._id,
        createdBy: user._id
      };
  
      // Create bill
      const dbStart = Date.now();
      const bill = await Bill.create(billData);
      const dbDuration = Date.now() - dbStart;
      
      logger.logDatabase('create', 'bills', dbDuration, undefined, { billId: bill._id });
      logger.logBusinessEvent('bill_created', user._id.toString(), 'bill', bill._id.toString(), {
        name: bill.name,
        amount: bill.amount,
        category: bill.category,
        isRecurring: bill.isRecurring
      });

      // If recurring, schedule next bill
      if (isRecurring) {
        const getNextDueDate = (frequency: string, currentDate: Date) => {
          const nextDate = new Date(currentDate);
          switch (frequency) {
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextDate.setMonth(nextDate.getMonth() + 3);
              break;
            case 'yearly':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
            default:
              nextDate.setMonth(nextDate.getMonth() + 1);
          }
          return nextDate;
        };

        // Create the next recurring bill
        const nextDueDate = getNextDueDate(frequency, new Date(dueDate));
        const nextBillData = {
          ...billData,
          dueDate: nextDueDate,
          user: user._id,
          createdBy: user._id
        };

        await Bill.create(nextBillData);
      }
  
      return NextResponse.json({ message: 'Bill created successfully', result: bill }, { status: 201 });
  
    } catch (error) {
      console.error('Error creating bill:', error);
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
  }