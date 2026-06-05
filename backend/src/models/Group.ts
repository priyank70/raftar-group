import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  installmentAmount: number;
  dueDay: number; // day of month (1-31)
  penaltyRate: number; // percentage per day
  qrCodeImage?: string;
  upiId?: string;
  upiName?: string;
  minimumVotesRequired: number;
  totalMembers: number;
  startDate: Date;
  rules: string[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, default: 'Raftar Group' },
    description: { type: String },
    installmentAmount: { type: Number, required: true, default: 1000 },
    dueDay: { type: Number, required: true, default: 25, min: 1, max: 31 },
    penaltyRate: { type: Number, required: true, default: 10 }, // 10% per day
    qrCodeImage: { type: String },
    upiId: { type: String },
    upiName: { type: String },
    minimumVotesRequired: { type: Number, default: 2 },
    totalMembers: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    rules: [{ type: String }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>('Group', GroupSchema);
