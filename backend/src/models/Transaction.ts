import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  investmentId?: mongoose.Types.ObjectId;
  type: 'credit' | 'debit';
  category: 'installment' | 'penalty' | 'investment_in' | 'investment_return' | 'advance' | 'refund';
  amount: number;
  balance: number; // group balance after transaction
  description: string;
  date: Date;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    investmentId: { type: Schema.Types.ObjectId, ref: 'Investment' },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: {
      type: String,
      enum: ['installment', 'penalty', 'investment_in', 'investment_return', 'advance', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    description: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
