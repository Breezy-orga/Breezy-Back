import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface représentant un utilisateur
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  bio: string;
  profilePicture: string;
  pseudonym: string;
  theme: 'light' | 'dark';
  profileViews: number;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
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
    pseudonym: {
      type: String,
      trim: true,
      default: '',
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
