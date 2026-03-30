import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  shopId:             { type: String, required: true, index: true },
  type:               { type: String, enum: ['in', 'out'], required: true },
  customerName:       { type: String, required: true },
  productDescription: { type: String, default: null },
  amount:             { type: Number, required: true },
  date:               { type: Date, required: true },
  payMode:            { type: String, enum: ['cash', 'online'], default: 'cash' },
  staffId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName:          { type: String, required: true },
  imageUrl:           { type: String, default: null },
  imageKey:           { type: String, default: null },
  notes:              { type: String, default: null },
  deletedAt:          { type: Date, default: null },
  // Stock linkage (optional — only for 'out' transactions)
  stockId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', default: null },
  stockName:          { type: String, default: null },
  stockCategory:      { type: String, default: null },
  quantitySold:       { type: Number, default: null },
  unit:               { type: String, default: null },
  // Customer wallet linkage (optional)
  linkedCustomerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  linkedCustomerUid:  { type: String, default: null }, // human-readable customerId e.g. "C001"
  // Source linkage — for mirror transactions created from expenses / salary / purchases
  sourceId:           { type: mongoose.Schema.Types.ObjectId, default: null },
  sourceType:         { type: String, enum: ['expense', 'salary', 'purchase', null], default: null },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
