import mongoose from 'mongoose';

  const GroceryListSchema = new mongoose.Schema({
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',
  required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    totalItems: { type: Number, default: 0 },
    completedItems: { type: Number, default: 0 },
    household: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' }
  }, {
    timestamps: true
  });

  export default mongoose.models.GroceryList ||
  mongoose.model('GroceryList', GroceryListSchema);