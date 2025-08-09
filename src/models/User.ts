import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: String,
  bio: String,
  avatar: String, // Cloudinary URL
  timezone: String,
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  emailNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  household: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  preferences: {
    choreReminders: { type: Boolean, default: true },
    billReminders: { type: Boolean, default: true },
    groceryNotifications: { type: Boolean, default: true }
  },
  // LinkedIn Credentials Integration (User's own account)
  linkedinAuth: {
    isConnected: { type: Boolean, default: false },
    email: String, // Encrypted LinkedIn email
    password: String, // Encrypted LinkedIn password
    connectedAt: Date, // When user added their LinkedIn credentials
    lastLoginAt: Date, // Last successful LinkedIn login
    loginStatus: { type: String, enum: ['active', 'expired', 'invalid', 'locked'], default: 'active' },
    profileData: {
      firstName: String,
      lastName: String,
      headline: String,
      profilePicture: String,
      location: String,
      industry: String
    }
  },
  // LinkedIn Job Search Preferences
  linkedinJobPreferences: {
    keywords: [{ type: String }], // Job search keywords
    locations: [{ type: String }], // Preferred job locations
    industries: [{ type: String }], // Preferred industries
    experienceLevel: { type: String, enum: ['entry', 'associate', 'mid', 'senior', 'director', 'executive'] },
    jobTypes: [{ type: String, enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship'] }],
    remoteWork: { type: Boolean, default: false },
    salaryMin: Number,
    salaryMax: Number,
    companySize: [{ type: String, enum: ['startup', 'small', 'medium', 'large', 'enterprise'] }],
    updatedAt: { type: Date, default: Date.now }
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);