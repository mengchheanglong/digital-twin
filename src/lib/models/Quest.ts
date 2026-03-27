import mongoose, { Document, Model } from 'mongoose';

export interface IQuest extends Document {
  userId: mongoose.Types.ObjectId;
  goal: string;
  duration: 'daily' | 'weekly' | 'monthly' | 'yearly';
  progress?: number;
  ratings?: number[];
  completed: boolean;
  date: Date;
  completedDate?: Date;
  recurrencesLeft?: number;
}

const questSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goal: { type: String, required: true, trim: true, maxlength: 100 },
  duration: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
  // Keep ratings for backward compatibility
  ratings: { type: [Number], default: undefined },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    // Not required to support legacy documents
  },
  completed: { type: Boolean, default: false },
  completedDate: { type: Date, default: null },
  recurrencesLeft: { type: Number }, // Optional: if undefined, infinite
  date: { type: Date, default: Date.now },
});

questSchema.index({ userId: 1, date: -1 });

const Quest: Model<IQuest> = mongoose.models.Quest || mongoose.model<IQuest>('Quest', questSchema);


export default Quest;
