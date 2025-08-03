import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log(`Request received: DELETE /api/tasks/${resolvedParams.id}`);
    await connectDB();
    
    // Get token from header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const result = await Task.deleteOne({ _id: resolvedParams.id, user: user._id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "The task has been successfully deleted" });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log(`Request received: PUT /api/tasks/${resolvedParams.id}`);
    await connectDB();
    
    // Get token from header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const result = await Task.updateOne(
      { _id: resolvedParams.id, user: user._id },
      body
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "The task has been successfully updated" });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}