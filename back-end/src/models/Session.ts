import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isExpired(): boolean;
}

const sessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Índice TTL para eliminar sesiones expiradas automáticamente
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Método para verificar si la sesión está expirada
sessionSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

export const Session = mongoose.model<ISession>('Session', sessionSchema);