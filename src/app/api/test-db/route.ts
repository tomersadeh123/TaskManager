import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    await connectDB();
    
    // Try to count users
    const userCount = await User.countDocuments();
    console.log('User count:', userCount);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      userCount 
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}