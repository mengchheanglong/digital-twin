import mongoose, { Document, Model } from 'mongoose';

export interface IUserInsightState extends Document {
  userId: mongoose.Types.ObjectId;
  topInterest: string;
  productivityScore: number;
  entertainmentRatio: number;
  currentTrend: 'rising' | 'stable' | 'dropping';
  lastReflection: string;
  updatedAt: Date;
  checkInDimensions?: {
    energy: number;
    focus: number;
    stressControl: number;
    socialConnection: number;
    optimism: number;
  };
}

const userInsightStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    topInterest: {
      type: String,
      default: '',
      trim: true,
    },
    productivityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    entertainmentRatio: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    currentTrend: {
      type: String,
      enum: ['rising', 'stable', 'dropping'],
      default: 'stable',
    },
    lastReflection: {
      type: String,
      default: '',
      trim: true,
    },
    checkInDimensions: {
      type: {
        energy: { type: Number, default: 0 },
        focus: { type: Number, default: 0 },
        stressControl: { type: Number, default: 0 },
        socialConnection: { type: Number, default: 0 },
        optimism: { type: Number, default: 0 },
      },
      default: undefined,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Handle hot reloading in development
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.UserInsightState;
}

const UserInsightState: Model<IUserInsightState> =
  mongoose.models.UserInsightState ||
  mongoose.model<IUserInsightState>('UserInsightState', userInsightStateSchema);

export default UserInsightState;
