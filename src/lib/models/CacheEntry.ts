import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICacheEntry extends Document {
  cacheKey: string;
  namespace: string;
  value: unknown;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cacheEntrySchema = new Schema<ICacheEntry>(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    namespace: { type: String, required: true, index: true },
    value: { type: Schema.Types.Mixed, required: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

cacheEntrySchema.index({ namespace: 1, expiresAt: 1 });
cacheEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CacheEntry: Model<ICacheEntry> =
  mongoose.models.CacheEntry || mongoose.model<ICacheEntry>('CacheEntry', cacheEntrySchema);

export default CacheEntry;
