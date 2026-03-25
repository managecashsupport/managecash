import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  shopId:         { type: String, required: true, index: true },
  stockId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true, index: true },
  stockName:      { type: String, required: true },   // denormalized
  stockCategory:  { type: String, required: true },   // denormalized
  type:           { type: String, enum: ['sale', 'restock', 'adjustment'], required: true },
  quantity:       { type: Number, required: true },   // positive = in, negative = out
  quantityBefore: { type: Number, required: true },
  quantityAfter:  { type: Number, required: true },
  transactionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  purchaseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
  customerName:   { type: String, default: '' },      // who bought
  note:           { type: String, default: '' },
  recordedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('StockMovement', stockMovementSchema);
