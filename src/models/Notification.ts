import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'bill' | 'task' | 'system' | 'reminder';
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['bill', 'task', 'system', 'reminder'], required: true },
    read: { type: Boolean, default: false },
    data: { type: Object },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
