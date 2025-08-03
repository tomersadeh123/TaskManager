import mongoose from 'mongoose';

  const HouseholdSchema = new mongoose.Schema({
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required:
  true },
    address: String,
    settings: {
      choreRotation: { type: Boolean, default: false },
      sharedGroceryLists: { type: Boolean, default: true },
      billReminders: { type: Boolean, default: true }
    }
  }, {
    timestamps: true
  });

  export default mongoose.models.Household || mongoose.model('Household',
  HouseholdSchema);