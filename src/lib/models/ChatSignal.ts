import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IChatSignal extends Document {
  chatId: string;
  userId: string;
  messageId: string;
  signalType: string;
  intensity: number;
  confidence: number;
  createdAt: Date;
}

const chatSignalSchema = new Schema(
  {
    chatId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    messageId: { type: String, required: true, index: true },
    signalType: { type: String, required: true },
    intensity: { type: Number, required: true },
    confidence: { type: Number, required: true },
  },
  { timestamps: true }
);

// Compound index for optimized analytics queries filtering by user and sorted by time
chatSignalSchema.index({ userId: 1, createdAt: -1 });
// Automatically expire signals after 180 days
chatSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const ChatSignal: Model<IChatSignal> =
  mongoose.models.ChatSignal || mongoose.model<IChatSignal>('ChatSignal', chatSignalSchema);

export default ChatSignal;
