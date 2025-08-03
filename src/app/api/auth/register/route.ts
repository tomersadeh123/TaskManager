import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/utils/jwt';
import userValidation from '@/lib/UserValidations';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    // Log the request
    logger.logRequest(request, requestId);
    
    await connectDB();
    
    const body = await request.json();
    const validation = userValidation({ body });
    
    if (!validation.isValid) {
      logger.logAuth('registration_failed', undefined, false, {
        reason: 'validation_failed',
        errors: validation.errors,
        requestId,
        providedFields: Object.keys(body)
      });
      
      return NextResponse.json(
        { message: 'Invalid data', errors: validation.errors },
        { status: 400 }
      );
    }

    const dbStart = Date.now();
    const user = new User(validation.data);
    await user.save();
    const dbDuration = Date.now() - dbStart;

    logger.logDatabase('create', 'users', dbDuration, undefined, { 
      userId: user._id,
      userName: user.userName 
    });

    const token = signToken(user._id);
    const duration = Date.now() - startTime;
    
    logger.logAuth('registration_success', user._id.toString(), true, {
      userName: user.userName,
      email: user.email,
      requestId,
      duration
    });
    
    logger.logBusinessEvent('user_registered', user._id.toString(), 'user', user._id.toString(), {
      userName: user.userName,
      email: user.email,
      registrationMethod: 'standard'
    });
    
    logger.logResponse(requestId, 201, duration, user._id.toString());
    
    return NextResponse.json(
      { message: 'User created', token },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if ((error as { code?: number }).code === 11000) {
      logger.logAuth('registration_failed', undefined, false, {
        reason: 'duplicate_user',
        requestId,
        duration,
        error: 'Username or email already exists'
      });
      
      logger.logResponse(requestId, 400, duration);
      
      return NextResponse.json(
        { message: 'Username or email already exists' },
        { status: 400 }
      );
    }
    
    logger.error('Registration error', error as Error, { requestId, duration });
    logger.logResponse(requestId, 500, duration);
    
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}