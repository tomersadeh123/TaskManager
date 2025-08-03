import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaintenanceItem from '@/models/MaintenanceItem';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

// GET /api/maintenance/[id] - Get Single Maintenance Item
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
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const { id: itemId } = await params;

    // Find the maintenance item and verify ownership
    const maintenanceItem = await MaintenanceItem.findOne({ 
      _id: itemId, 
      user: user._id 
    });

    if (!maintenanceItem) {
      return NextResponse.json({ message: 'Maintenance item not found' }, { status: 404 });
    }

    // Add computed fields
    const now = new Date();
    const scheduledDate = new Date(maintenanceItem.scheduledDate);
    const isOverdue = ['pending', 'in_progress'].includes(maintenanceItem.status) && scheduledDate < now;
    const isDueSoon = ['pending', 'in_progress'].includes(maintenanceItem.status) && 
                     scheduledDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const itemWithStatus = {
      ...maintenanceItem.toJSON(),
      isOverdue,
      isDueSoon,
      daysUntilDue: Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    };

    return NextResponse.json({ result: itemWithStatus });
  } catch (error) {
    console.error('Error fetching maintenance item:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PUT /api/maintenance/[id] - Update Maintenance Item
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

    const body = await request.json();
    const { id: itemId } = await params;

    // Find the maintenance item and verify ownership
    const maintenanceItem = await MaintenanceItem.findOne({ 
      _id: itemId, 
      user: user._id 
    });

    if (!maintenanceItem) {
      return NextResponse.json({ message: 'Maintenance item not found' }, { status: 404 });
    }

    // If marking as completed, set completion date
    if (body.status === 'completed' && maintenanceItem.status !== 'completed') {
      body.completedDate = new Date();
      if (body.actualCost === undefined) {
        body.actualCost = maintenanceItem.estimatedCost;
      }
    }

    // Update the maintenance item
    const updatedItem = await MaintenanceItem.findByIdAndUpdate(
      itemId,
      { ...body, updatedAt: new Date() },
      { new: true }
    );

    return NextResponse.json({ 
      message: 'Maintenance item updated successfully',
      result: updatedItem 
    });
  } catch (error) {
    console.error('Error updating maintenance item:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/maintenance/[id] - Delete Maintenance Item
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

    // Find and delete the maintenance item (verify ownership)
    const maintenanceItem = await MaintenanceItem.findOne({ 
      _id: itemId, 
      user: user._id 
    });

    if (!maintenanceItem) {
      return NextResponse.json({ message: 'Maintenance item not found' }, { status: 404 });
    }

    await MaintenanceItem.findByIdAndDelete(itemId);

    return NextResponse.json({ message: 'Maintenance item deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance item:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}