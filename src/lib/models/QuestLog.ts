import mongoose, { Document, Model } from 'mongoose';

export interface IQuestLog extends Document {
  userId: mongoose.Types.ObjectId;
  questId: mongoose.Types.ObjectId;
  goal: string;
  duration: 'daily' | 'weekly' | 'monthly' | 'yearly';
  progress: number;
  completedDate: Date;
  createdDate: Date;
  deletedDate?: Date;
  isDeleted: boolean;
}

const questLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', required: true },
  goal: { type: String, required: true, trim: true, maxlength: 100 },
  duration: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
  completedDate: { type: Date, required: true },
  createdDate: { type: Date, required: true },
  deletedDate: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true,
});

questLogSchema.index({ userId: 1, completedDate: -1 });
questLogSchema.index({ userId: 1, questId: 1 });

const QuestLog: Model<IQuestLog> = mongoose.models.QuestLog || mongoose.model<IQuestLog>('QuestLog', questLogSchema);

export default QuestLog;
