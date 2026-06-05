import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  amount: number;
  paymentType: 'installment' | 'advance' | 'penalty' | 'partial' | 'cash';
  isCashPayment: boolean;
  status: 'pending' | 'approved' | 'rejected';
  transactionNote?: string;
  transactionId: string;
  adminNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  coverageMonths: number; // how many months this covers
  remainingBalance: number; // leftover balance in rupees
  installmentIds: mongoose.Types.ObjectId[]; // which installments this covers
  penaltyIncluded: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentType: {
      type: String,
      enum: ['installment', 'advance', 'penalty', 'partial', 'cash'],
      required: true,
    },
    isCashPayment: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    transactionNote: { type: String },
    transactionId: { type: String, required: true },
    adminNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    coverageMonths: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    installmentIds: [{ type: Schema.Types.ObjectId, ref: 'Installment' }],
    penaltyIncluded: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
