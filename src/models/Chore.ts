import mongoose from 'mongoose';

  const ChoreSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User',
  required: true },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'once'],
      default: 'weekly'
    },
    lastCompleted: Date,
    nextDue: Date,
    category: {
      type: String,
      enum: ['cleaning', 'kitchen', 'bathroom', 'bedroom', 'outdoor',
  'maintenance', 'other'],
      default: 'other'
    },
    estimatedTime: Number,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',
  required: true },
    household: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' }
  }, {
    timestamps: true
  });

  export default mongoose.models.Chore || mongoose.model('Chore',
  ChoreSchema);