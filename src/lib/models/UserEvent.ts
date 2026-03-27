import mongoose, { Document, Model } from 'mongoose';

export interface IUserEvent extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'quest_completed' | 'chat_message' | 'log_added';
  metadata: {
    category?: string;
    duration?: number;
    topic?: string;
    overallScore?: number;
    percentage?: number;
  };
  createdAt: Date;
}

const userEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['quest_completed', 'chat_message', 'log_added'],
      required: true,
    },
    metadata: {
      category: {
        type: String,
        trim: true,
      },
      duration: {
        type: Number,
        min: 0,
      },
      topic: {
        type: String,
        trim: true,
      },
      overallScore: {
        type: Number,
        min: 0,
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for efficient queries
userEventSchema.index({ userId: 1, createdAt: -1 });
userEventSchema.index({ userId: 1, type: 1 });
// Automatically expire events after 90 days
userEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const UserEvent: Model<IUserEvent> =
  mongoose.models.UserEvent || mongoose.model<IUserEvent>('UserEvent', userEventSchema);

export default UserEvent;
