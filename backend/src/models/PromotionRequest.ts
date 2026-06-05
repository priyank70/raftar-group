import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotionRequest extends Document {
  candidateId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  votes: {
    userId: mongoose.Types.ObjectId;
    vote: 'approve' | 'reject';
    comment?: string;
    votedAt: Date;
  }[];
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionRequestSchema = new Schema<IPromotionRequest>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    votes: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        vote: { type: String, enum: ['approve', 'reject'], required: true },
        comment: { type: String },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IPromotionRequest>('PromotionRequest', PromotionRequestSchema);
