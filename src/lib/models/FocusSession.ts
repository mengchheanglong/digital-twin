import mongoose, { Document, Model } from 'mongoose';

export interface IFocusSession extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  durationMinutes: number;
  elapsedMinutes?: number;
  startedAt: Date;
  endedAt?: Date;
  completed: boolean;
  notes?: string;
}

const focusSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    durationMinutes: { type: Number, required: true, min: 1, max: 480 },
    elapsedMinutes: { type: Number, min: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    completed: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

focusSessionSchema.index({ userId: 1, startedAt: -1 });

const FocusSession: Model<IFocusSession> =
  mongoose.models.FocusSession ||
  mongoose.model<IFocusSession>('FocusSession', focusSessionSchema);

export default FocusSession;
