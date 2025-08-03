import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GroceryList from '@/models/GroceryList';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// Interface for shared user object
interface SharedUser {
  user: string | { _id: string; toString(): string };
  permission: string;
}

// POST /api/grocery-lists/[id]/share - Share Grocery List with Users
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
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: listId } = await params;
    const body = await request.json();
    const { userIds, permission = 'view' } = body; // userIds can be array or single ID

    // Find the list and verify ownership (only creator can share)
    const groceryList = await GroceryList.findOne({ 
      _id: listId, 
      createdBy: user._id 
    });

    if (!groceryList) {
      return NextResponse.json({ 
        message: 'Grocery list not found or no sharing permission' 
      }, { status: 404 });
    }

    // Validate userIds
    if (!userIds || (Array.isArray(userIds) && userIds.length === 0)) {
      return NextResponse.json(
        { message: 'User IDs are required' },
        { status: 400 }
      );
    }

    const idsToShare = Array.isArray(userIds) ? userIds : [userIds];

    // Validate permission
    if (!['view', 'edit'].includes(permission)) {
      return NextResponse.json(
        { message: 'Permission must be either "view" or "edit"' },
        { status: 400 }
      );
    }

    // Verify all users exist
    const usersToShare = await User.find({ _id: { $in: idsToShare } });
    if (usersToShare.length !== idsToShare.length) {
      return NextResponse.json(
        { message: 'One or more users not found' },
        { status: 400 }
      );
    }

    // Prevent sharing with self
    if (idsToShare.includes(user._id.toString())) {
      return NextResponse.json(
        { message: 'Cannot share list with yourself' },
        { status: 400 }
      );
    }

    // Add users to sharedWith array (avoid duplicates)
    const currentSharedUserIds = groceryList.sharedWith.map((s: SharedUser) => 
      typeof s.user === 'string' ? s.user : s.user.toString()
    );
    const newSharedUsers = idsToShare
      .filter(id => !currentSharedUserIds.includes(id))
      .map(userId => ({
        user: userId,
        permission
      }));

    if (newSharedUsers.length === 0) {
      return NextResponse.json(
        { message: 'All specified users already have access to this list' },
        { status: 400 }
      );
    }

    // Update the list
    const updatedList = await GroceryList.findByIdAndUpdate(
      listId,
      { 
        $push: { sharedWith: { $each: newSharedUsers } },
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate('createdBy', 'userName')
    .populate('sharedWith.user', 'userName');

    return NextResponse.json({ 
      message: `List shared with ${newSharedUsers.length} user(s) successfully`,
      result: updatedList 
    });
  } catch (error) {
    console.error('Error sharing grocery list:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/grocery-lists/[id]/share - Remove users from shared list
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

    const { id: listId } = await params;
    const body = await request.json();
    const { userIds } = body;

    // Find the list and verify ownership
    const groceryList = await GroceryList.findOne({ 
      _id: listId, 
      createdBy: user._id 
    });

    if (!groceryList) {
      return NextResponse.json({ 
        message: 'Grocery list not found or no sharing permission' 
      }, { status: 404 });
    }

    // Validate userIds
    if (!userIds || (Array.isArray(userIds) && userIds.length === 0)) {
      return NextResponse.json(
        { message: 'User IDs are required' },
        { status: 400 }
      );
    }

    const idsToRemove = Array.isArray(userIds) ? userIds : [userIds];

    // Remove users from sharedWith array
    const updatedList = await GroceryList.findByIdAndUpdate(
      listId,
      { 
        $pull: { sharedWith: { user: { $in: idsToRemove } } },
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate('createdBy', 'userName')
    .populate('sharedWith.user', 'userName');

    return NextResponse.json({ 
      message: 'Users removed from shared list successfully',
      result: updatedList 
    });
  } catch (error) {
    console.error('Error removing users from shared list:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}