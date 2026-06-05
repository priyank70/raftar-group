import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'member';
  avatar?: string;
  isActive: boolean;
  isDisabled: boolean;
  joinedAt: Date;
  lastLogin?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    isDisabled: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.set('toJSON', {
  transform: function (doc, ret: any) {
    delete ret.password;
    delete ret.refreshToken;
    return ret;
  },
});

export default mongoose.model<IUser>('User', UserSchema);
