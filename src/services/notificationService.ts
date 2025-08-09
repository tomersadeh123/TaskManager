import { logger } from '@/lib/logger';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

interface CreateNotificationData {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'bill' | 'task' | 'system' | 'reminder';
  data?: Record<string, unknown>;
}

class NotificationService {
  static async create(notificationData: CreateNotificationData) {
    const notification = await Notification.create(notificationData);

    // Try to send via Socket.IO, but don't fail if it's not available
    try {
      // Check if we're in a server environment with Socket.IO
      if (typeof global !== 'undefined' && global.io) {
        global.io.to(`user_${notificationData.userId}`).emit('notification', notification);
        console.log(`📤 Sent notification to user_${notificationData.userId} with message ${notificationData.message}`);
        logger.info(`📤 Sent notification to user_${notificationData.userId} with message ${notificationData.message}`);
      } else {
        // Socket.IO not available, notification still saved to database
        console.log(`💾 Notification saved to database for user_${notificationData.userId} (Socket.IO not available)`);
        logger.info(`💾 Notification saved to database for user_${notificationData.userId}`);
      }
    } catch (error) {
      console.error('Socket.IO error:', error);
      logger.error('Socket.IO emission failed', error as Error);
    }

    return notification;
  }

  static async sendBillReminder(userId: string, bill: Record<string, unknown>){
    return this.create({
      userId,
      title: 'Bill Reminder',
      message: `${bill.name} is due in 3 days`,
      type: 'bill',
      data: { billId: bill._id }
    });
  }
}

export default NotificationService;