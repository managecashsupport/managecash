import mongoose from 'mongoose';

const inviteCodeSchema = new mongoose.Schema({
  shopId:    { type: String, required: true, index: true },
  code:      { type: String, required: true, unique: true },
  role:      { type: String, enum: ['staff', 'admin'], default: 'staff' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedAt:    { type: Date, default: null },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
}, { timestamps: true });

export default mongoose.model('InviteCode', inviteCodeSchema);
