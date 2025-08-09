import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GroceryList from '@/models/GroceryList';
import GroceryItem from '@/models/GroceryItem';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// GET /api/grocery-lists/[id] - Get Single Grocery List with Items
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

    // Find the list and verify access
    const groceryList = await GroceryList.findOne({
      _id: listId,
      $or: [
        { createdBy: user._id },
        { 'sharedWith.user': user._id }
      ]
    })
    .populate('createdBy', 'userName')
    .populate('sharedWith.user', 'userName');

    if (!groceryList) {
      return NextResponse.json({ message: 'Grocery list not found' }, { status: 404 });
    }

    // Get all items for this list
    const items = await GroceryItem.find({ groceryList: listId })
      .populate('addedBy', 'userName')
      .sort({ createdAt: 1 });

    const result = {
      ...groceryList.toJSON(),
      items
    };

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error fetching grocery list:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/grocery-lists/[id] - Update Grocery List
export async function PUT(
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

    const body = await request.json();
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

    // Update the list
    const updatedList = await GroceryList.findByIdAndUpdate(
      listId,
      { ...body, updatedAt: new Date() },
      { new: true }
    )
    .populate('createdBy', 'userName')
    .populate('sharedWith.user', 'userName');

    return NextResponse.json({ 
      message: 'Grocery list updated successfully',
      result: updatedList 
    });
  } catch (error) {
    console.error('Error updating grocery list:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/grocery-lists/[id] - Delete Grocery List
export async function DELETE(
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

    // Find and delete the list (only creator can delete)
    const groceryList = await GroceryList.findOne({ 
      _id: listId, 
      createdBy: user._id 
    });
    
    if (!groceryList) {
      return NextResponse.json({ 
        message: 'Grocery list not found or no delete permission' 
      }, { status: 404 });
    }

    // Delete all items in the list first
    await GroceryItem.deleteMany({ groceryList: listId });

    // Delete the list
    await GroceryList.findByIdAndDelete(listId);

    return NextResponse.json({ message: 'Grocery list deleted successfully' });
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}