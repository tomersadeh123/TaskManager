import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';
import validation from '@/lib/RequestValidations';
import { logger } from '@/lib/logger';

// GET /api/tasks - Get all tasks for authenticated user
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    logger.logRequest(request, requestId);
    await connectDB();
    
    // Get token from header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      logger.logAuth('tasks_access_failed', undefined, false, {
        reason: 'no_token',
        requestId
      });
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      logger.logAuth('tasks_access_failed', decoded.id, false, {
        reason: 'user_not_found',
        requestId
      });
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const dbStart = Date.now();
    const tasks = await Task.find({ user: user._id });
    const dbDuration = Date.now() - dbStart;
    
    logger.logDatabase('find', 'tasks', dbDuration, undefined, { 
      userId: user._id,
      taskCount: tasks.length 
    });
    
    const duration = Date.now() - startTime;
    logger.logBusinessEvent('tasks_retrieved', user._id.toString(), 'task', undefined, {
      taskCount: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length
    });
    
    logger.logResponse(requestId, 200, duration, user._id.toString());
    
    return NextResponse.json({ message: "All items were found.", result: tasks });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Tasks GET error', error as Error, { requestId, duration });
    logger.logResponse(requestId, 401, duration);
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    logger.logRequest(request, requestId);
    await connectDB();
    
    // Get token from header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      logger.logAuth('task_creation_failed', undefined, false, {
        reason: 'no_token',
        requestId
      });
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      logger.logAuth('task_creation_failed', decoded.id, false, {
        reason: 'user_not_found',
        requestId
      });
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const validationRes = validation({ body });

    if (validationRes.isValid) {
      const taskData = {
        ...validationRes.data,
        user: user._id
      };
      
      const dbStart = Date.now();
      const task = new Task(taskData);
      await task.save();
      const dbDuration = Date.now() - dbStart;
      
      logger.logDatabase('create', 'tasks', dbDuration, undefined, { 
        taskId: task._id,
        userId: user._id 
      });
      
      const duration = Date.now() - startTime;
      logger.logBusinessEvent('task_created', user._id.toString(), 'task', task._id.toString(), {
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate
      });
      
      logger.logResponse(requestId, 200, duration, user._id.toString());
      
      return NextResponse.json({ message: "A task was created", result: task });
    } else {
      logger.warn('Task creation validation failed', {
        userId: user._id.toString(),
        errors: validationRes.errors,
        requestId,
        providedData: Object.keys(body)
      });
      
      const duration = Date.now() - startTime;
      logger.logResponse(requestId, 400, duration, user._id.toString());
      
      return NextResponse.json(
        { message: "Invalid data", errors: validationRes.errors },
        { status: 400 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Tasks POST error', error as Error, { requestId, duration });
    logger.logResponse(requestId, 500, duration);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}