import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/utils/jwt';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    // Log the request
    logger.logRequest(request, requestId);
    
    await connectDB();
    
    const { userName, password } = await request.json();

    if (!userName || !password) {
      logger.logAuth('login_failed', undefined, false, { 
        reason: 'missing_credentials',
        requestId,
        provided: { userName: !!userName, password: !!password }
      });
      
      return NextResponse.json(
        { message: 'Username and password required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ userName });
    if (!user || !(await user.comparePassword(password))) {
      logger.logAuth('login_failed', user?._id?.toString(), false, { 
        reason: user ? 'invalid_password' : 'user_not_found',
        userName,
        requestId
      });
      
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken(user._id);
    const duration = Date.now() - startTime;
    
    logger.logAuth('login_success', user._id.toString(), true, { 
      userName,
      requestId,
      duration
    });
    
    logger.logResponse(requestId, 200, duration, user._id.toString());
    
    return NextResponse.json({
      token,
      user: { id: user._id, userName: user.userName }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Login error', error as Error, { requestId, duration });
    logger.logResponse(requestId, 500, duration);
    
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}