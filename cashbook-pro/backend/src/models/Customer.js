import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  shopId:     { type: String, required: true, index: true },
  customerId: { type: String, required: true },
  fullName:   { type: String, required: true },
  mobile:     { type: String, required: true },
  address:    { type: String, default: '' },
  village:    { type: String, default: '' },
  balance:    { type: Number, default: 0 },
  isLoan:     { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ shopId: 1, customerId: 1 }, { unique: true });
customerSchema.index({ shopId: 1, isActive: 1, fullName: 1 });   // list + search
customerSchema.index({ shopId: 1, isActive: 1, mobile: 1 });     // mobile lookup/uniqueness
customerSchema.index({ shopId: 1, village: 1, isActive: 1 });    // village filter

export default mongoose.model('Customer', customerSchema);
