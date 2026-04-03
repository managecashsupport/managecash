import mongoose from 'mongoose';

const salaryPaymentSchema = new mongoose.Schema({
  amount:     { type: Number, required: true },
  note:       { type: String, default: '' },
  payMode:    { type: String, enum: ['cash', 'online'], default: 'cash' },
  date:       { type: Date, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const salarySchema = new mongoose.Schema({
  shopId:      { type: String, required: true, index: true },
  staffId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName:   { type: String, required: true },
  month:       { type: Number, required: true },
  year:        { type: Number, required: true },
  baseSalary:  { type: Number, required: true },
  deductions:  { type: Number, default: 0 },
  netSalary:   { type: Number, required: true },
  paidAmount:  { type: Number, default: 0 },
  balance:     { type: Number, required: true },
  status:      { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  payments:    { type: [salaryPaymentSchema], default: [] },
  notes:       { type: String, default: '' },
}, { timestamps: true });

salarySchema.index({ shopId: 1, staffId: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ shopId: 1, year: -1, month: -1 });  // list sorted by period
salarySchema.index({ shopId: 1, status: 1 });             // status filter

export default mongoose.model('Salary', salarySchema);
