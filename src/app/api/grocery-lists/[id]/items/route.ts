import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GroceryList from '@/models/GroceryList';
import GroceryItem from '@/models/GroceryItem';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// POST /api/grocery-lists/[id]/items - Add Items to Grocery List
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: listId } = await params;

    // Find the list and verify edit permission
    const groceryList = await GroceryList.findOne({
      _id: listId,
      $or: [
        { createdBy: user._id },
        { 
          'sharedWith.user': user._id,
          'sharedWith.permission': 'edit'
        }
      ]
    });

    if (!groceryList) {
      return NextResponse.json({ 
        message: 'Grocery list not found or no edit permission' 
      }, { status: 404 });
    }

    const body = await request.json();
    const { items } = body; // Expecting an array of items or single item

    // Validate items
    if (!items || (Array.isArray(items) && items.length === 0)) {
      return NextResponse.json(
        { message: 'Items are required' },
        { status: 400 }
      );
    }

    const itemsToAdd = Array.isArray(items) ? items : [items];

    // Validate each item
    for (const item of itemsToAdd) {
      if (!item.name) {
        return NextResponse.json(
          { message: 'Item name is required' },
          { status: 400 }
        );
      }
    }

    // Create items
    const newItems = await Promise.all(
      itemsToAdd.map(async (item) => {
        const itemData = {
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'piece',
          category: item.category || 'other',
          estimatedPrice: item.estimatedPrice || 0,
          notes: item.notes || '',
          priority: item.priority || 'medium',
          isCompleted: false,
          groceryList: listId,
          addedBy: user._id
        };

        const newItem = await GroceryItem.create(itemData);
        await newItem.populate('addedBy', 'userName');
        return newItem;
      })
    );

    // Update list statistics
    const totalItems = await GroceryItem.countDocuments({ groceryList: listId });
    const completedItems = await GroceryItem.countDocuments({ 
      groceryList: listId, 
      isCompleted: true 
    });
    const totalEstimatedCost = await GroceryItem.aggregate([
      { $match: { groceryList: listId } },
      { $group: { _id: null, total: { $sum: '$estimatedPrice' } } }
    ]);

    await GroceryList.findByIdAndUpdate(listId, {
      totalItems,
      completedItems,
      totalEstimatedCost: totalEstimatedCost[0]?.total || 0
    });

    return NextResponse.json({ 
      message: `${newItems.length} item(s) added successfully`,
      result: newItems 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding items to grocery list:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// GET /api/grocery-lists/[id]/items - Get Items from Grocery List
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: listId } = await params;
    const url = new URL(request.url);
    const completed = url.searchParams.get('completed');
    const category = url.searchParams.get('category');

    // Verify list access
    const groceryList = await GroceryList.findOne({
      _id: listId,
      $or: [
        { createdBy: user._id },
        { 'sharedWith.user': user._id }
      ]
    });

    if (!groceryList) {
      return NextResponse.json({ message: 'Grocery list not found' }, { status: 404 });
    }

    const query: Record<string, unknown> = { groceryList: listId };

    if (completed === 'true') {
      query.isCompleted = true;
    } else if (completed === 'false') {
      query.isCompleted = false;
    }

    if (category) {
      query.category = category;
    }

    const items = await GroceryItem.find(query)
      .populate('addedBy', 'userName')
      .sort({ isCompleted: 1, priority: -1, createdAt: 1 });

    return NextResponse.json({ result: items });
  } catch (error) {
    console.error('Error fetching grocery list items:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}