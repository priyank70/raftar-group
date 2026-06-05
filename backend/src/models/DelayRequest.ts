import mongoose, { Document, Schema } from 'mongoose';

export interface IDelayRequest extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  installmentId: mongoose.Types.ObjectId;
  originalDueDate: Date;
  requestedDate: Date;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: {
    userId: mongoose.Types.ObjectId;
    vote: 'approve' | 'reject';
    comment?: string;
    votedAt: Date;
  }[];
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  penaltyStartsFrom?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DelayRequestSchema = new Schema<IDelayRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    installmentId: { type: Schema.Types.ObjectId, ref: 'Installment', required: true },
    originalDueDate: { type: Date, required: true },
    requestedDate: { type: Date, required: true },
    reason: { type: String, required: true },
    notes: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    votes: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        vote: { type: String, enum: ['approve', 'reject'], required: true },
        comment: { type: String },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    penaltyStartsFrom: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IDelayRequest>('DelayRequest', DelayRequestSchema);
