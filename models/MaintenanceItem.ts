import mongoose from 'mongoose';

  const MaintenanceItemSchema = new mongoose.Schema({
    item: { type: String, required: true },
    description: String,
    lastDone: Date,
    nextDue: Date,
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'as-needed'],
      default: 'yearly'
    },
    category: {
      type: String,
      enum: ['hvac', 'plumbing', 'electrical', 'appliances', 'outdoor',
  'safety', 'cleaning', 'other'],
      default: 'other'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    estimatedCost: Number,
    actualCost: Number,
    notes: String,
    isCompleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',
  required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    household: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' },
    vendor: String,
    warrantyCovered: { type: Boolean, default: false }
  }, {
    timestamps: true
  });

  export default mongoose.models.MaintenanceItem ||
  mongoose.model('MaintenanceItem', MaintenanceItemSchema);