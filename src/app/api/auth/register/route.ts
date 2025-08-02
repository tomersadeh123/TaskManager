import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/utils/jwt';
import userValidation from '@/lib/UserValidations';

export async function POST(request: NextRequest) {
  try {
    // Log the request
    console.log('Request received: POST /api/auth/register');
    
    await connectDB();
    
    const body = await request.json();
    const validation = userValidation({ body });
    
    if (!validation.isValid) {
      return NextResponse.json(
        { message: 'Invalid data', errors: validation.errors },
        { status: 400 }
      );
    }

    const user = new User(validation.data);
    await user.save();

    const token = signToken(user._id);
    
    return NextResponse.json(
      { message: 'User created', token },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { message: 'Username or email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}