import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/task';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';
import validation from '@/lib/RequestValidations';

// GET /api/tasks - Get all tasks for authenticated user
export async function GET(request: NextRequest) {
  try {
    console.log('Request received: GET /api/tasks');
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

    const tasks = await Task.find({ user: user._id });
    return NextResponse.json({ message: "All items were found.", result: tasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    console.log('Request received: POST /api/tasks');
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
    const validationRes = validation({ body });

    if (validationRes.isValid) {
      const taskData = {
        ...validationRes.data,
        user: user._id
      };
      
      const task = new Task(taskData);
      await task.save();
      
      return NextResponse.json({ message: "A task was created" });
    } else {
      return NextResponse.json(
        { message: "Invalid data", errors: validationRes.errors },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}