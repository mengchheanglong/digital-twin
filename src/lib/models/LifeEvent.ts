import mongoose, { Document, Model } from 'mongoose';

export type LifeEventCategory =
  | 'career'
  | 'health'
  | 'relationship'
  | 'personal'
  | 'travel'
  | 'achievement'
  | 'challenge'
  | 'other';

export interface ILifeEvent extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  category: LifeEventCategory;
  notes: string;
  date: Date;
  dayKey: string;
  createdAt: Date;
}

const lifeEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['career', 'health', 'relationship', 'personal', 'travel', 'achievement', 'challenge', 'other'],
      default: 'other',
    },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    date: { type: Date, required: true },
    dayKey: { type: String, required: true },
  },
  { timestamps: true },
);

lifeEventSchema.index({ userId: 1, date: -1 });
lifeEventSchema.index({ userId: 1, dayKey: 1 });

const LifeEvent: Model<ILifeEvent> =
  mongoose.models.LifeEvent ||
  mongoose.model<ILifeEvent>('LifeEvent', lifeEventSchema);

export default LifeEvent;
