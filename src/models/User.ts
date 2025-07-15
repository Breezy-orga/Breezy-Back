import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface représentant un utilisateur
export interface IUser extends Document {
  username: string;
  name?: string;
  email: string;
  password: string;
  role: string;
  bio: string;
  profilePicture: string;
  theme: 'light' | 'dark';
  profileViews: number;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  
  status: 'active' | 'suspended' | 'banned';
  suspendedUntil?: Date;
  suspensionReason?: string;
  moderationHistory: mongoose.Types.ObjectId[];
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Interface pour le modèle avec les méthodes statiques éventuelles
interface IUserModel extends Model<IUser> {

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
    name: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
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
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user'
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
    
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    suspendedUntil: {
      type: Date,
    },
    suspensionReason: {
      type: String,
    },
    moderationHistory: [{
      type: Schema.Types.ObjectId,
      ref: 'ModerationAction',
    }],
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

// Méthode pour vérifier si l'utilisateur peut effectuer des actions
userSchema.methods.canPerformActions = function(): boolean {
  if (this.status === 'banned') return false;
  if (this.status === 'suspended') {
    if (this.suspendedUntil && new Date() > this.suspendedUntil) {
      // Auto-réactivation si la suspension a expiré
      this.status = 'active';
      this.suspendedUntil = undefined;
      this.suspensionReason = undefined;
      this.save();
      return true;
    }
    return false;
  }
  return true;
};

// Virtuals pour peupler posts et comments
userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author'
});
userSchema.virtual('comments', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'parentPost'
});

// Inclure les virtuals dans toJSON / toObject
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

// Index pour améliorer les performances
userSchema.index({ status: 1 });
userSchema.index({ suspendedUntil: 1 });

const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;