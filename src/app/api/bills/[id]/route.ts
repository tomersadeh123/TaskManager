import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Bill from '@/models/Bill';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// PUT /api/bills/[id] - Update Bill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Parse token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const { id: billId } = await params;

    // Find the bill and verify ownership
    const bill = await Bill.findOne({ _id: billId, user: user._id });
    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    // Update the bill
    const updatedBill = await Bill.findByIdAndUpdate(
      billId,
      { ...body, updatedAt: new Date() },
      { new: true }
    );

    return NextResponse.json({ 
      message: 'Bill updated successfully',
      result: updatedBill 
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/bills/[id] - Delete Bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Parse token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: billId } = await params;

    // Find and delete the bill (verify ownership)
    const bill = await Bill.findOne({ _id: billId, user: user._id });
    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    await Bill.findByIdAndDelete(billId);

    return NextResponse.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// GET /api/bills/[id] - Get Single Bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Parse token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: billId } = await params;

    // Find the bill and verify ownership
    const bill = await Bill.findOne({ _id: billId, user: user._id });
    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    // Calculate additional information
    const now = new Date();
    const dueDate = new Date(bill.dueDate);
    const isOverdue = !bill.isPaid && dueDate < now;
    const isDueSoon = !bill.isPaid && dueDate <= new Date(now.getTime() + (bill.reminderDays || 3) * 24 * 60 * 60 * 1000);
    
    const billWithStatus = {
      ...bill.toJSON(),
      isOverdue,
      isDueSoon,
      daysUntilDue: Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    };

    return NextResponse.json({ result: billWithStatus });
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}