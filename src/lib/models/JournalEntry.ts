import mongoose, { Document, Model } from 'mongoose';

export interface IJournalEntry extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  mood?: string;
  tags: string[];
  date: Date;
  dayKey: string;
}

const journalEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    mood: { type: String, trim: true, maxlength: 50 },
    tags: { type: [String], default: [] },
    date: { type: Date, default: Date.now },
    dayKey: { type: String, required: true },
  },
  { timestamps: true },
);

journalEntrySchema.index({ userId: 1, date: -1 });
journalEntrySchema.index({ userId: 1, dayKey: 1 });

const JournalEntry: Model<IJournalEntry> =
  mongoose.models.JournalEntry ||
  mongoose.model<IJournalEntry>('JournalEntry', journalEntrySchema);

export default JournalEntry;
