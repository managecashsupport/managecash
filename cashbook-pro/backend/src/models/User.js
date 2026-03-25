import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  shopId:       { type: String, required: true, index: true },
  name:         { type: String, required: true },
  username:     { type: String, required: true },
  email:        { type: String, default: null },
  phone:        { type: String, default: null },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin', 'staff'], default: 'staff' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// username must be unique per shop
userSchema.index({ shopId: 1, username: 1 }, { unique: true });

export default mongoose.model('User', userSchema);
