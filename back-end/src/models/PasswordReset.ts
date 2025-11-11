import mongoose, { Document, Schema } from 'mongoose';

export interface IPasswordReset extends Document {
  email: string;
  code: string; // código de verificación (6 dígitos)
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  used: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

passwordResetSchema.index({ email: 1, code: 1, used: 1 });

export const PasswordReset = mongoose.model<IPasswordReset>('PasswordReset', passwordResetSchema);