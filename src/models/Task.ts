import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: String
});

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);