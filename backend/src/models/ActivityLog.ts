import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  action: string;
  entityType: 'payment' | 'installment' | 'investment' | 'delay_request' | 'user' | 'group' | 'rules';
  entityId?: mongoose.Types.ObjectId;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ['payment', 'installment', 'investment', 'delay_request', 'user', 'group', 'rules'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true, versionKey: false }
);

ActivityLogSchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
