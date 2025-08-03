import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GroceryList from '@/models/GroceryList';
import GroceryItem from '@/models/GroceryItem';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// PUT /api/grocery-items/[id] - Update Grocery Item
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
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: itemId } = await params;
    const body = await request.json();

    // Find the item
    const item = await GroceryItem.findById(itemId).populate('groceryList');
    if (!item) {
      return NextResponse.json({ message: 'Grocery item not found' }, { status: 404 });
    }

    // Verify edit permission on the list
    const groceryList = await GroceryList.findOne({
      _id: item.groceryList,
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
        message: 'No edit permission for this grocery list' 
      }, { status: 403 });
    }

    const wasCompleted = item.isCompleted;
    
    // Update the item
    const updatedItem = await GroceryItem.findByIdAndUpdate(
      itemId,
      { ...body, updatedAt: new Date() },
      { new: true }
    ).populate('addedBy', 'userName');

    // If completion status changed, update list statistics
    if (wasCompleted !== updatedItem.isCompleted) {
      const completedItems = await GroceryItem.countDocuments({ 
        groceryList: item.groceryList, 
        isCompleted: true 
      });

      await GroceryList.findByIdAndUpdate(item.groceryList, {
        completedItems
      });
    }

    // If price changed, update total estimated cost
    if (body.estimatedPrice !== undefined) {
      const totalEstimatedCost = await GroceryItem.aggregate([
        { $match: { groceryList: item.groceryList } },
        { $group: { _id: null, total: { $sum: '$estimatedPrice' } } }
      ]);

      await GroceryList.findByIdAndUpdate(item.groceryList, {
        totalEstimatedCost: totalEstimatedCost[0]?.total || 0
      });
    }

    return NextResponse.json({ 
      message: 'Grocery item updated successfully',
      result: updatedItem 
    });
  } catch (error) {
    console.error('Error updating grocery item:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/grocery-items/[id] - Delete Grocery Item
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
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: itemId } = await params;

    // Find the item
    const item = await GroceryItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ message: 'Grocery item not found' }, { status: 404 });
    }

    // Verify edit permission on the list
    const groceryList = await GroceryList.findOne({
      _id: item.groceryList,
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
        message: 'No edit permission for this grocery list' 
      }, { status: 403 });
    }

    // Delete the item
    await GroceryItem.findByIdAndDelete(itemId);

    // Update list statistics
    const totalItems = await GroceryItem.countDocuments({ groceryList: item.groceryList });
    const completedItems = await GroceryItem.countDocuments({ 
      groceryList: item.groceryList, 
      isCompleted: true 
    });
    const totalEstimatedCost = await GroceryItem.aggregate([
      { $match: { groceryList: item.groceryList } },
      { $group: { _id: null, total: { $sum: '$estimatedPrice' } } }
    ]);

    await GroceryList.findByIdAndUpdate(item.groceryList, {
      totalItems,
      completedItems,
      totalEstimatedCost: totalEstimatedCost[0]?.total || 0
    });

    return NextResponse.json({ message: 'Grocery item deleted successfully' });
  } catch (error) {
    console.error('Error deleting grocery item:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}