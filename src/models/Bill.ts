import mongoose from 'mongoose';

  const BillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    category: {
      type: String,
      enum: ['utilities', 'rent', 'mortgage', 'insurance', 'internet',
  'phone', 'groceries', 'entertainment', 'other'],
      default: 'other'
    },
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    isPaid: { type: Boolean, default: false },
    paidDate: Date,
    reminderDays: { type: Number, default: 3 }, // days before due date
    notes: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',
  required: true },
    household: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' },
    paymentMethod: String,
    vendor: String
  }, {
    timestamps: true
  });

  export default mongoose.models.Bill || mongoose.model('Bill',
  BillSchema);