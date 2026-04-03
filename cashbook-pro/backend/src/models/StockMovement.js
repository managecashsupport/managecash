import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  shopId:         { type: String, required: true, index: true },
  stockId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true, index: true },
  stockName:      { type: String, required: true },
  stockCategory:  { type: String, required: true },
  type:           { type: String, enum: ['sale', 'restock', 'adjustment'], required: true },
  quantity:       { type: Number, required: true },
  quantityBefore: { type: Number, required: true },
  quantityAfter:  { type: Number, required: true },
  transactionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  purchaseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
  customerName:   { type: String, default: '' },
  note:           { type: String, default: '' },
  recordedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

stockMovementSchema.index({ shopId: 1, stockId: 1, createdAt: -1 }); // item history
stockMovementSchema.index({ shopId: 1, type: 1, createdAt: -1 });    // analytics by type

export default mongoose.model('StockMovement', stockMovementSchema);
