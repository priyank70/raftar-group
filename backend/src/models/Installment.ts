import mongoose, { Document, Schema } from 'mongoose';

export interface IInstallment extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'covered_by_advance';
  paidAt?: Date;
  penaltyAmount: number;
  penaltyDays: number;
  isAdvanceCovered: boolean;
  advancePaymentId?: mongoose.Types.ObjectId;
  isDelayed: boolean;
  extendedDueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstallmentSchema = new Schema<IInstallment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'covered_by_advance'],
      default: 'pending',
    },
    paidAt: { type: Date },
    penaltyAmount: { type: Number, default: 0 },
    penaltyDays: { type: Number, default: 0 },
    isAdvanceCovered: { type: Boolean, default: false },
    advancePaymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    isDelayed: { type: Boolean, default: false },
    extendedDueDate: { type: Date },
  },
  { timestamps: true }
);

InstallmentSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model<IInstallment>('Installment', InstallmentSchema);
