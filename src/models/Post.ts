import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';
import { IComment } from './Comment';
import { IMedia } from './media';
import mediaSchema from './media';



// Interface représentant un post
export interface IPost extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  commentsCount: number;
  parentPost?: mongoose.Types.ObjectId;
  isComment: boolean;
  media: IMedia[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour le modèle avec les méthodes statiques éventuelles
interface IPostModel extends Model<IPost> {
}

const postSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: false, // Rendu optionnel pour permettre les posts avec seulement des médias
      maxlength: 280,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
    },
    parentPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    isComment: {
      type: Boolean,
      default: false,
    },
    media: [mediaSchema], // Tableau de médias (photos/vidéos)
    tags: [{
      type: String,
      trim: true
    }], // Tableau de tags pour catégoriser les posts
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances des requêtes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ parentPost: 1 });
postSchema.index({ commentsCount: -1 }); // Index pour trier par nombre de commentaires

const Post = mongoose.model<IPost, IPostModel>('Post', postSchema);

export default Post;
