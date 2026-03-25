import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  shopId:        { type: String, required: true, index: true },
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  type:          { type: String, enum: ['credit', 'debit'], required: true },
  amount:        { type: Number, required: true, min: 0.01 },
  balanceBefore: { type: Number, required: true },
  balanceAfter:  { type: Number, required: true },
  note:          { type: String, default: '' },
  payMode:       { type: String, enum: ['cash', 'online'], default: 'cash' },
  recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:          { type: Date, required: true },  // payment date chosen by staff
}, { timestamps: true }); // createdAt = actual entry time

export default mongoose.model('WalletTransaction', walletTransactionSchema);
