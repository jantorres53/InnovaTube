import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: Date;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  videoId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  channelTitle: {
    type: String,
    required: true,
    trim: true
  },
  publishedAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Índice compuesto único para evitar duplicados
favoriteSchema.index({ userId: 1, videoId: 1 }, { unique: true });

// Índice para búsquedas rápidas por usuario
favoriteSchema.index({ userId: 1, createdAt: -1 });

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);