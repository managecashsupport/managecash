import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  shopId:             { type: String, required: true, index: true },
  customerId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  // credit = funds added, debit = manual deduction, sale = goods sold (balance reduced), payment = customer paid via transaction
  type:               { type: String, enum: ['credit', 'debit', 'sale', 'payment'], required: true },
  amount:             { type: Number, required: true, min: 0.01 },
  balanceBefore:      { type: Number, required: true },
  balanceAfter:       { type: Number, required: true },
  note:               { type: String, default: '' },
  payMode:            { type: String, enum: ['cash', 'online'], default: 'cash' },
  recordedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:               { type: Date, required: true },
  // Populated when type = 'sale' or 'payment' (linked to a Transaction record)
  transactionId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  productDescription: { type: String, default: null },
  stockName:          { type: String, default: null },
  quantitySold:       { type: Number, default: null },
  unit:               { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('WalletTransaction', walletTransactionSchema);
