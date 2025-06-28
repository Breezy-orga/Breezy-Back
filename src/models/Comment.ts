import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';

<<<<<<< Updated upstream
// Interface représentant le format des médias
interface IMedia {
  base64: string;
  contentType: string;
=======
// Interface pour les médias intégrés dans les commentaires
export interface IMedia {
  filename?: string;
  base64?: string;
  contentType?: string;
  alt?: string;
>>>>>>> Stashed changes
}

// Interface représentant un commentaire
export interface IComment extends Document {
  content: string;
  author: mongoose.Types.ObjectId | IUser;
  post: mongoose.Types.ObjectId | IPost;
  parentComment?: mongoose.Types.ObjectId | IComment;
  likes: mongoose.Types.ObjectId[] | IUser[];
  media?: IMedia[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour le modèle avec les méthodes statiques éventuelles
interface ICommentModel extends Model<IComment> {
  // Ajoutez ici des méthodes statiques si nécessaire
}

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
      maxlength: 280,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    media: [
      {
        base64: {
          type: String,
        },
        contentType: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances des requêtes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

const Comment = mongoose.model<IComment, ICommentModel>('Comment', commentSchema);

export default Comment;
