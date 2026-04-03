import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  shopId:      { type: String, required: true, index: true },
  category:    { type: String, required: true },
  amount:      { type: Number, required: true },
  description: { type: String, default: '' },
  date:        { type: Date, required: true },
  payMode:     { type: String, enum: ['cash', 'online'], default: 'cash' },
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

expenseSchema.index({ shopId: 1, date: -1 });           // list + date range
expenseSchema.index({ shopId: 1, category: 1, date: -1 }); // category filter

export default mongoose.model('Expense', expenseSchema);
