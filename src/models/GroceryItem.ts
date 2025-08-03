import mongoose from 'mongoose';

  const GroceryItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit: {
      type: String,
      enum: ['pieces', 'kg', 'g', 'l', 'ml', 'dozen', 'pack', 'bottle',
  'can', 'box'],
      default: 'pieces'
    },
    category: {
      type: String,
      enum: ['produce', 'dairy', 'meat', 'bakery', 'pantry', 'frozen',
  'beverages', 'snacks', 'household', 'other'],
      default: 'other'
    },
    isCompleted: { type: Boolean, default: false },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required:
   true },
    groceryList: { type: mongoose.Schema.Types.ObjectId, ref:
  'GroceryList', required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    notes: String,
    estimatedPrice: Number
  }, {
    timestamps: true
  });

  export default mongoose.models.GroceryItem ||
  mongoose.model('GroceryItem', GroceryItemSchema);