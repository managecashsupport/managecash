import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  shopId:     { type: String, required: true, index: true },
  customerId: { type: String, required: true }, // unique per shop
  fullName:   { type: String, required: true },
  mobile:     { type: String, required: true },
  address:    { type: String, default: '' },
  village:    { type: String, default: '' },
  balance:    { type: Number, default: 0 },   // can go negative (loan)
  isLoan:     { type: Boolean, default: false }, // true when balance < 0
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

// customerId must be unique per shop
customerSchema.index({ shopId: 1, customerId: 1 }, { unique: true });

export default mongoose.model('Customer', customerSchema);
