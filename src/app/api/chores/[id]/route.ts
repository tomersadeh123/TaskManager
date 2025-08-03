import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chore from '@/models/Chore';
import User from '@/models/User';
import { verifyToken } from '@/utils/jwt';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const { id: choreId } = await params;

    // Find the chore
    const chore = await Chore.findById(choreId);
    if (!chore) {
      return NextResponse.json({ message: 'Chore not found' }, { status: 404 });
    }

    // Update the chore
    const updatedChore = await Chore.findByIdAndUpdate(
      choreId,
      { ...body, updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'userName');

    return NextResponse.json({ result: updatedChore });
  } catch (error) {
    console.error('Error updating chore:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: choreId } = await params;

    // Find and delete the chore
    const chore = await Chore.findById(choreId);
    if (!chore) {
      return NextResponse.json({ message: 'Chore not found' }, { status: 404 });
    }

    await Chore.findByIdAndDelete(choreId);

    return NextResponse.json({ message: 'Chore deleted successfully' });
  } catch (error) {
    console.error('Error deleting chore:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}