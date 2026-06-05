import mongoose, { Document, Schema } from 'mongoose';

export interface ISettlement extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  status: 'requested_by_member' | 'proposed_by_admin' | 'accepted_by_member';
  totalInvested: number;
  groupProfitShare: number;
  finalAmount: number;
  adminNote?: string;
  proposedAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    status: {
      type: String,
      enum: ['requested_by_member', 'proposed_by_admin', 'accepted_by_member'],
      default: 'requested_by_member',
    },
    totalInvested: { type: Number, default: 0 },
    groupProfitShare: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    adminNote: { type: String },
    proposedAt: { type: Date },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ISettlement>('Settlement', SettlementSchema);
