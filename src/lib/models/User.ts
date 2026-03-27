import mongoose, { Document, Model } from 'mongoose';
import { getRequiredXP } from '@/lib/progression';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  age: number;
  location: string;
  bio: string;
  avatarStage: string;
  joinDate: Date;
  level: number;
  currentXP: number;
  requiredXP: number;
  badges: string[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordChangedAt?: Date | null;
  lastQuestResetDate?: Date;
  timezone: string;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Adventurer',
    },
    age: {
      type: Number,
      default: 25,
      min: 1,
      max: 120,
    },
    location: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    bio: {
      type: String,
      default: 'Building calm systems for steady personal growth.',
      trim: true,
    },
    avatarStage: {
      type: String,
      default: 'Focused Strategist',
      trim: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    currentXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredXP: {
      type: Number,
      default: getRequiredXP(1),
      min: 100,
    },
    badges: {
      type: [String],
      default: [],
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    lastQuestResetDate: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: 'Asia/Bangkok',
    },
  },
  {
    timestamps: true,
  },
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
