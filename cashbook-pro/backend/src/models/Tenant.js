import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
  shopId:                { type: String, required: true, unique: true, index: true },
  shopName:              { type: String, required: true },
  ownerName:             { type: String, required: true },
  ownerEmail:            { type: String, required: true },
  plan:                  { type: String, enum: ['monthly', 'yearly', 'yearly_pro'], default: null },
  status:                { type: String, enum: ['trial', 'active', 'grace_period', 'suspended', 'cancelled'], default: 'trial' },
  trialEndsAt:           { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  subscriptionEndsAt:    { type: Date, default: null },
  lastPaymentId:         { type: String, default: null },
  razorpaySubscriptionId:{ type: String, default: null },
}, { timestamps: true });

export default mongoose.model('Tenant', tenantSchema);
