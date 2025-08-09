import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Bill from '@/models/Bill';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';
import NotificationService from '@/services/notificationService';
import { logger } from '@/lib/logger';

// POST /api/bills/[id]/pay - Mark Bill as Paid
export async function POST(
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
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: billId } = await params;
    const body = await request.json();
    const { paidDate, amount } = body;

    // Find the bill and verify ownership
    const bill = await Bill.findOne({ _id: billId, user: user._id });
    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    if (bill.isPaid) {
      return NextResponse.json({ message: 'Bill is already paid' }, { status: 400 });
    }

    // Update the bill as paid
    const updateData: Record<string, unknown> = {
      isPaid: true,
      paidDate: paidDate ? new Date(paidDate) : new Date(),
      updatedAt: new Date()
    };

    // If amount is provided, update it (in case of partial payment or adjustment)
    if (amount !== undefined) {
      updateData.paidAmount = parseFloat(amount);
    }

    const updatedBill = await Bill.findByIdAndUpdate(
      billId,
      updateData,
      { new: true }
    );

    // Send notification for bill payment
    try {
      await NotificationService.create({
        userId: user._id.toString(),
        title: 'Bill Paid Successfully',
        message: `Bill "${bill.name}" has been marked as paid. Amount: $${updateData.paidAmount || bill.amount}`,
        type: 'bill',
        data: {
          billId: bill._id.toString(),
          amount: updateData.paidAmount || bill.amount,
          paidDate: updateData.paidDate
        }
      });
    } catch (notificationError) {
      logger.error('Failed to send bill payment notification', notificationError as Error, {
        billId: bill._id.toString(),
        userId: user._id.toString()
      });
    }

    return NextResponse.json({ 
      message: 'Bill marked as paid successfully',
      result: updatedBill 
    });
  } catch (error) {
    console.error('Error marking bill as paid:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/bills/[id]/pay - Mark Bill as Unpaid
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
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: billId } = await params;

    // Find the bill and verify ownership
    const bill = await Bill.findOne({ _id: billId, user: user._id });
    if (!bill) {
      return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
    }

    // Update the bill as unpaid
    const updatedBill = await Bill.findByIdAndUpdate(
      billId,
      { 
        isPaid: false,
        paidDate: undefined,
        paidAmount: undefined,
        updatedAt: new Date()
      },
      { new: true }
    );

    return NextResponse.json({ 
      message: 'Bill marked as unpaid successfully',
      result: updatedBill 
    });
  } catch (error) {
    console.error('Error marking bill as unpaid:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}