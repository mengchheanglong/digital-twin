import mongoose, { Document, Model } from 'mongoose';

export interface IUserMemory extends Document {
  userId: mongoose.Types.ObjectId;
  summary: string;
  recurringStruggles: string[];
  breakthroughTriggers: string[];
  seasonalPatterns: string[];
  effectiveInterventions: string[];
  keyPersonalityTraits: string[];
  lastSynthesizedAt: Date;
  weeksCovered: number;
}

const userMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    summary: { type: String, default: '', trim: true },
    recurringStruggles: { type: [String], default: [] },
    breakthroughTriggers: { type: [String], default: [] },
    seasonalPatterns: { type: [String], default: [] },
    effectiveInterventions: { type: [String], default: [] },
    keyPersonalityTraits: { type: [String], default: [] },
    lastSynthesizedAt: { type: Date, default: Date.now },
    weeksCovered: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const UserMemory: Model<IUserMemory> =
  mongoose.models.UserMemory ||
  mongoose.model<IUserMemory>('UserMemory', userMemorySchema);

export default UserMemory;
