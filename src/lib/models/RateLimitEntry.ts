import mongoose, { Document, Model } from 'mongoose';

export interface IRateLimitEntry extends Document {
  windowId: string;
  key: string;
  purpose: string;
  count: number;
  resetAt: Date;
}

const rateLimitEntrySchema = new mongoose.Schema(
  {
    windowId: { type: String, required: true, unique: true },
    key: { type: String, required: true },
    purpose: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    resetAt: { type: Date, required: true },
  },
  { timestamps: false },
);

// TTL index — MongoDB deletes expired windows automatically
rateLimitEntrySchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
rateLimitEntrySchema.index({ key: 1, purpose: 1 });

const RateLimitEntry: Model<IRateLimitEntry> =
  mongoose.models.RateLimitEntry ||
  mongoose.model<IRateLimitEntry>('RateLimitEntry', rateLimitEntrySchema);

export default RateLimitEntry;
