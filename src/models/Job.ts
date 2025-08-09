import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IJob extends Document {
  _id: Types.ObjectId;
  title: string;
  company: string;
  location: string;
  postingDate: string;
  postingDays: number;
  source: 'LinkedIn' | 'Drushim.il';
  url: string;
  description: string;
  searchKeyword: string;
  scrapedAt: Date;
  appliedBy?: Types.ObjectId; // Reference to User who applied
  appliedDate?: Date;
  isApplied: boolean;
  user: Types.ObjectId; // User who this job belongs to
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  location: {
    type: String,
    default: 'Israel',
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  postingDate: {
    type: String,
    required: true,
    default: 'Unknown'
  },
  postingDays: {
    type: Number,
    default: 999,
    min: [0, 'Posting days cannot be negative']
  },
  source: {
    type: String,
    enum: ['LinkedIn', 'Drushim.il'],
    required: [true, 'Job source is required']
  },
  url: {
    type: String,
    required: [true, 'Job URL is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    maxlength: [10000, 'Description cannot exceed 10000 characters']
  },
  searchKeyword: {
    type: String,
    required: [true, 'Search keyword is required'],
    trim: true
  },
  scrapedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  appliedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  appliedDate: {
    type: Date,
    default: null
  },
  isApplied: {
    type: Boolean,
    default: false
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
JobSchema.index({ user: 1, scrapedAt: -1 });
JobSchema.index({ user: 1, isApplied: 1 });
JobSchema.index({ user: 1, source: 1 });
JobSchema.index({ user: 1, postingDays: 1 });
JobSchema.index({ title: 1, company: 1, user: 1 }, { unique: true }); // Prevent duplicates per user

// Virtual for job freshness
JobSchema.virtual('freshness').get(function(this: IJob) {
  if (this.postingDays === 0) return 'Today';
  if (this.postingDays === 1) return 'Yesterday';
  if (this.postingDays <= 3) return 'Hot';
  if (this.postingDays <= 7) return 'This Week';
  return 'Older';
});

// Virtual for application status
JobSchema.virtual('applicationStatus').get(function(this: IJob) {
  if (this.isApplied && this.appliedDate) {
    return `Applied on ${this.appliedDate.toDateString()}`;
  }
  return 'Not Applied';
});

// Static method to get jobs stats for a user
JobSchema.statics.getJobsStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        appliedJobs: { $sum: { $cond: ['$isApplied', 1, 0] } },
        newJobs: { $sum: { $cond: [{ $lte: ['$postingDays', 3] }, 1, 0] } },
        linkedinJobs: { $sum: { $cond: [{ $eq: ['$source', 'LinkedIn'] }, 1, 0] } },
        drushimJobs: { $sum: { $cond: [{ $eq: ['$source', 'Drushim.il'] }, 1, 0] } }
      }
    }
  ]);

  return stats[0] || {
    totalJobs: 0,
    appliedJobs: 0,
    newJobs: 0,
    linkedinJobs: 0,
    drushimJobs: 0
  };
};

// Static method to get recent jobs for a user
JobSchema.statics.getRecentJobs = async function(userId: string, limit = 10) {
  return await this.find({ user: userId })
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .populate('user', 'userName email');
};

// Static method to get unapplied jobs for a user
JobSchema.statics.getUnappliedJobs = async function(userId: string) {
  return await this.find({ 
    user: userId, 
    isApplied: false 
  })
    .sort({ postingDays: 1, scrapedAt: -1 })
    .populate('user', 'userName email');
};

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);