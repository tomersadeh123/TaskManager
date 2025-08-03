import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/utils/jwt';

export async function POST(request: NextRequest) {
  try {
    // Log the request
    console.log('Request received: POST /api/auth/login');
    
    await connectDB();
    
    const { userName, password } = await request.json();

    if (!userName || !password) {
      return NextResponse.json(
        { message: 'Username and password required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ userName });
    if (!user || !(await user.comparePassword(password))) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken(user._id);
    
    return NextResponse.json({
      token,
      user: { id: user._id, userName: user.userName }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}