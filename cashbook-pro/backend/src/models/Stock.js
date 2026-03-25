import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  shopId:       { type: String, required: true, index: true },
  name:         { type: String, required: true },
  category:     { type: String, required: true },
  description:  { type: String, default: '' },
  quantity:     { type: Number, required: true, default: 0 },
  unit:         { type: String, default: 'pcs' }, // pcs, kg, litre, box, dozen, etc.
  pricePerUnit: { type: Number, required: true, default: 0 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// LOW STOCK = quantity <= 5 (hardcoded)
export const LOW_STOCK_THRESHOLD = 5;

export default mongoose.model('Stock', stockSchema);
