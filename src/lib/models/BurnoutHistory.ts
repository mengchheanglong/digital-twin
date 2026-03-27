import mongoose, { Document, Model } from 'mongoose';

export type BurnoutStage = 'thriving' | 'tiring' | 'strained' | 'overwhelmed';

export interface IBurnoutHistory extends Document {
  userId: mongoose.Types.ObjectId;
  stage: BurnoutStage;
  riskScore: number;
  dayKey: string;
  recordedAt: Date;
}

const burnoutHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stage: {
      type: String,
      enum: ['thriving', 'tiring', 'strained', 'overwhelmed'],
      required: true,
    },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    dayKey: { type: String, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

burnoutHistorySchema.index({ userId: 1, recordedAt: -1 });
burnoutHistorySchema.index({ userId: 1, dayKey: 1 });
// Auto-expire entries after 180 days
burnoutHistorySchema.index({ recordedAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const BurnoutHistory: Model<IBurnoutHistory> =
  mongoose.models.BurnoutHistory ||
  mongoose.model<IBurnoutHistory>('BurnoutHistory', burnoutHistorySchema);

export default BurnoutHistory;
