import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyToken } from '@/utils/jwt';
import { logger } from '@/lib/logger';

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Get user from token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Build query
    const query: Record<string, unknown> = { userId: decoded.userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      userId: decoded.userId,
      read: false
    });

    logger.info(`Fetched ${notifications.length} notifications for user ${decoded.userId}`, {
      userId: decoded.userId,
      unreadCount,
      totalFetched: notifications.length
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    logger.error('Error fetching notifications:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Create new notification (for system use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type, data } = body;

    // Validate required fields
    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message, type' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['bill', 'task', 'system', 'reminder'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Create notification
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      data: data || {}
    });

    logger.info(`Created notification for user ${userId}`, {
      notificationId: notification._id,
      userId,
      type,
      title
    });

    return NextResponse.json(notification, { status: 201 });

  } catch (error) {
    logger.error('Error creating notification:', error as Error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    // Get user from token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    let result;

    if (markAllAsRead) {
      // Mark all user notifications as read
      result = await Notification.updateMany(
        { userId: decoded.userId, read: false },
        { read: true }
      );

      logger.info(`Marked all notifications as read for user ${decoded.userId}`, {
        userId: decoded.userId,
        modifiedCount: result.modifiedCount
      });

    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      result = await Notification.updateMany(
        { 
          _id: { $in: notificationIds },
          userId: decoded.userId // Ensure user can only update their own notifications
        },
        { read: true }
      );

      logger.info(`Marked ${notificationIds.length} notifications as read for user ${decoded.userId}`, {
        userId: decoded.userId,
        notificationIds,
        modifiedCount: result.modifiedCount
      });

    } else {
      return NextResponse.json(
        { error: 'Either provide notificationIds array or set markAllAsRead to true' },
        { status: 400 }
      );
    }

    // Get updated unread count
    const unreadCount = await Notification.countDocuments({
      userId: decoded.userId,
      read: false
    });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      unreadCount
    });

  } catch (error) {
    logger.error('Error updating notifications:', error as Error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}