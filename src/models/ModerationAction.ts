import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IModerationAction extends Document {
  moderator: mongoose.Types.ObjectId;
  target: mongoose.Types.ObjectId;
  action: 'suspend' | 'ban' | 'warn' | 'unsuspend' | 'unban' | 'delete_post';
  reason: string;
  duration?: number;
  expiresAt?: Date;
  relatedReport?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const moderationActionSchema = new Schema<IModerationAction>(
  {
    moderator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['suspend', 'ban', 'warn', 'unsuspend', 'unban', 'delete_post'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    duration: {
      type: Number, // en jours
    },
    expiresAt: {
      type: Date,
    },
    relatedReport: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
    },
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances
moderationActionSchema.index({ target: 1, createdAt: -1 });
moderationActionSchema.index({ moderator: 1, createdAt: -1 });
moderationActionSchema.index({ expiresAt: 1 });

const ModerationAction = mongoose.model<IModerationAction>('ModerationAction', moderationActionSchema);
export default ModerationAction;