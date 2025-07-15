import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId; // Utilisateur qui signale
  reported: mongoose.Types.ObjectId; // Utilisateur signalé (optionnel)
  post?: mongoose.Types.ObjectId; // Post signalé (optionnel)
  type: 'spam' | 'harassment' | 'inappropriate' | 'hate_speech' | 'violence' | 'other';
  reason: string; // Commentaire du signaleur
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  moderator?: mongoose.Types.ObjectId; // Admin/modérateur qui a traité
  moderatorAction?: string; // Action prise par le modérateur
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reported: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    type: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'hate_speech', 'violence', 'other'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
    moderator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatorAction: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ post: 1 });

const Report = mongoose.model<IReport>('Report', reportSchema);
export default Report;