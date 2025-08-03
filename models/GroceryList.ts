import mongoose from 'mongoose';

const GroceryListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  totalEstimatedCost: {
    type: Number,
    default: 0
  },
  completedItems: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  notes: {
    type: String
  },
  household: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household'
  }
}, {
  timestamps: true
});

// Calculate completion percentage
GroceryListSchema.virtual('completionPercentage').get(function() {
  if (this.totalItems === 0) return 0;
  return Math.round((this.completedItems / this.totalItems) * 100);
});

// Ensure virtual fields are serialized
GroceryListSchema.set('toJSON', { virtuals: true });

export default mongoose.models.GroceryList || mongoose.model('GroceryList', GroceryListSchema);