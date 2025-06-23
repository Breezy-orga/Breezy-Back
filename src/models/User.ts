import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface représentant un utilisateur
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  bio: string;
  profilePicture: string;
  theme: 'light' | 'dark';
  profileViews: number;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour le modèle avec les méthodes statiques éventuelles
interface IUserModel extends Model<IUser> {
  // Ajoutez ici des méthodes statiques si nécessaire
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    bio: {
      type: String,
      maxlength: 160,
      default: '',
    },
    profilePicture: {
      type: String,
      default: '/default-avatar.png',
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    profileViews: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
