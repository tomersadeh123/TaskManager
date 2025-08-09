import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GroceryList from '@/models/GroceryList';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// GET /api/grocery-lists - Get Grocery Lists
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const active = url.searchParams.get('active');
    const shared = url.searchParams.get('shared');
    const limit = url.searchParams.get('limit');

    let query: Record<string, unknown> = {
      $or: [
        { createdBy: user._id },
        { 'sharedWith.user': user._id }
      ]
    };
    
    if (active === 'true') {
      query.isActive = true;
    } else if (active === 'false') {
      query.isActive = false;
    }

    if (shared === 'true') {
      query = { 'sharedWith.user': user._id };
    } else if (shared === 'false') {
      query = { createdBy: user._id };
    }

    let listQuery = GroceryList.find(query)
      .populate('createdBy', 'userName')
      .populate('sharedWith.user', 'userName')
      .sort({ createdAt: -1 });

    if (limit) {
      listQuery = listQuery.limit(parseInt(limit));
    }

    const groceryLists = await listQuery;

    return NextResponse.json({ result: groceryLists });
  } catch (error) {
    console.error('Error fetching grocery lists:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/grocery-lists - Create Grocery List
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, priority, dueDate, notes } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: 'List name is required' },
        { status: 400 }
      );
    }

    const listData = {
      name,
      description: description || '',
      createdBy: user._id,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes || '',
      isActive: true,
      totalItems: 0,
      completedItems: 0,
      totalEstimatedCost: 0
    };

    const newList = await GroceryList.create(listData);

    // Populate the createdBy field before returning
    await newList.populate('createdBy', 'userName');

    return NextResponse.json({ 
      message: 'Grocery list created successfully',
      result: newList 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating grocery list:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}