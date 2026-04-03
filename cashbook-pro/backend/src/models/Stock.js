import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  shopId:       { type: String, required: true, index: true },
  name:         { type: String, required: true },
  category:     { type: String, required: true },
  description:  { type: String, default: '' },
  quantity:     { type: Number, required: true, default: 0 },
  unit:         { type: String, default: 'pcs' },
  pricePerUnit: { type: Number, required: true, default: 0 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

stockSchema.index({ shopId: 1, isActive: 1, category: 1, name: 1 }); // list grouped by category
stockSchema.index({ shopId: 1, isActive: 1, quantity: 1 });           // low-stock filter
stockSchema.index({ shopId: 1, name: 1, isActive: 1 });               // name lookup in purchases

// LOW STOCK = quantity <= 5 (hardcoded)
export const LOW_STOCK_THRESHOLD = 5;

export default mongoose.model('Stock', stockSchema);
