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
  linkedCustomerUid:  { type: String, default: null },
  // Source linkage — for mirror transactions created from expenses / salary / purchases
  sourceId:           { type: mongoose.Schema.Types.ObjectId, default: null },
  sourceType:         { type: String, enum: ['expense', 'salary', 'purchase', null], default: null },
}, { timestamps: true });

// Compound indexes — cover every common query pattern
transactionSchema.index({ shopId: 1, deletedAt: 1, date: -1 });              // list + range queries
transactionSchema.index({ shopId: 1, deletedAt: 1, type: 1, date: -1 });     // type filter
transactionSchema.index({ shopId: 1, deletedAt: 1, staffId: 1, date: -1 });  // staff filter
transactionSchema.index({ shopId: 1, deletedAt: 1, payMode: 1 });            // pay mode filter
transactionSchema.index({ shopId: 1, sourceId: 1, sourceType: 1 });          // mirror tx lookups
transactionSchema.index({ shopId: 1, linkedCustomerId: 1, date: -1 });       // customer wallet

export default mongoose.model('Transaction', transactionSchema);
