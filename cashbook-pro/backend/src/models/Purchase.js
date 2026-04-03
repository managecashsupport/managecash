import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  category:    { type: String, default: '' },
  quantity:    { type: Number, required: true },
  unit:        { type: String, default: 'pcs' },
  pricePerUnit:{ type: Number, required: true },
  totalPrice:  { type: Number, required: true },
  stockId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', default: null },
}, { _id: false });

const purchasePaymentSchema = new mongoose.Schema({
  amount:     { type: Number, required: true },
  note:       { type: String, default: '' },
  payMode:    { type: String, enum: ['cash', 'online'], default: 'cash' },
  date:       { type: Date, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const purchaseSchema = new mongoose.Schema({
  shopId:      { type: String, required: true, index: true },
  vendor:      { type: String, required: true },
  billNo:      { type: String, default: '' },
  gstNo:       { type: String, default: '' },
  items:       { type: [purchaseItemSchema], required: true },
  totalAmount: { type: Number, required: true },
  paidAmount:  { type: Number, default: 0 },
  balance:     { type: Number, required: true },
  status:      { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  date:        { type: Date, required: true },
  notes:       { type: String, default: '' },
  payments:    { type: [purchasePaymentSchema], default: [] },
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseSchema.index({ shopId: 1, date: -1 });                // list + date range
purchaseSchema.index({ shopId: 1, status: 1, date: -1 });    // status filter
purchaseSchema.index({ shopId: 1, vendor: 1, status: 1 });   // vendor + open-purchase lookup

export default mongoose.model('Purchase', purchaseSchema);
