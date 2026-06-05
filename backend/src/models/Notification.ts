import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId; // recipient
  groupId: mongoose.Types.ObjectId;
  type:
    | 'payment_submitted'
    | 'payment_approved'
    | 'payment_rejected'
    | 'due_reminder'
    | 'penalty_alert'
    | 'investment_update'
    | 'rule_change'
    | 'announcement'
    | 'delay_request'
    | 'delay_approved'
    | 'delay_rejected'
    | 'vote_update'
    | 'member_joined'
    | 'member_removed'
    | 'promotion_request'
    | 'promotion_approved'
    | 'promotion_rejected'
    | 'disable_request'
    | 'disable_approved'
    | 'disable_rejected';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'payment_submitted',
        'payment_approved',
        'payment_rejected',
        'due_reminder',
        'penalty_alert',
        'investment_update',
        'rule_change',
        'announcement',
        'delay_request',
        'delay_approved',
        'delay_rejected',
        'vote_update',
        'member_joined',
        'member_removed',
        'promotion_request',
        'promotion_approved',
        'promotion_rejected',
        'disable_request',
        'disable_approved',
        'disable_rejected',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
