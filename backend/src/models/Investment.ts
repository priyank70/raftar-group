import mongoose, { Document, Schema } from 'mongoose';

export interface IEmiRepayment {
  month: number;
  year: number;
  amount: number;
  paidAt: Date;
  note?: string;
  recordedBy: mongoose.Types.ObjectId;
}

export interface IInvestment extends Document {
  groupId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  // Borrower info
  personName: string;
  personPhone?: string;
  personEmail?: string;
  personAddress?: string;
  personAadhaar?: string;
  loanPurpose?: string;
  collateral?: string;
  guarantorName?: string;
  // Investment details
  type: 'business' | 'personal_loan' | 'interest_lending';
  amount: number;
  interestRate: number;
  interestType: 'monthly' | 'yearly';
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  notes?: string;
  // Repayment
  repaymentMode: 'emi' | 'lump_sum';
  emiAmount: number;
  emiRepayments: IEmiRepayment[];
  repaidAmount: number;
  // Status & voting
  status: 'active' | 'completed' | 'defaulted' | 'pending_approval';
  totalReturn: number;
  profit: number;
  monthlyEarning: number;
  votes: {
    userId: mongoose.Types.ObjectId;
    vote: 'approve' | 'reject';
    comment?: string;
    votedAt: Date;
  }[];
  isApproved: boolean;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmiRepaymentSchema = new Schema<IEmiRepayment>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
    note: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true }
);

const InvestmentSchema = new Schema<IInvestment>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Borrower KYC
    personName: { type: String, required: true },
    personPhone: { type: String },
    personEmail: { type: String },
    personAddress: { type: String },
    personAadhaar: { type: String }, // store full, mask on frontend
    loanPurpose: { type: String },
    collateral: { type: String },
    guarantorName: { type: String },
    // Investment
    type: {
      type: String,
      enum: ['business', 'personal_loan', 'interest_lending'],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    interestRate: { type: Number, required: true, min: 0 },
    interestType: { type: String, enum: ['monthly', 'yearly'], default: 'yearly' },
    durationMonths: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    notes: { type: String },
    // Repayment
    repaymentMode: { type: String, enum: ['emi', 'lump_sum'], default: 'lump_sum' },
    emiAmount: { type: Number, default: 0 },
    emiRepayments: { type: [EmiRepaymentSchema], default: [] },
    repaidAmount: { type: Number, default: 0 },
    // Returns
    totalReturn: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    monthlyEarning: { type: Number, default: 0 },
    // Status
    status: {
      type: String,
      enum: ['active', 'completed', 'defaulted', 'pending_approval'],
      default: 'pending_approval',
    },
    votes: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        vote: { type: String, enum: ['approve', 'reject'], required: true },
        comment: { type: String },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IInvestment>('Investment', InvestmentSchema);
