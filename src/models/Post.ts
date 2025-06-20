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
  parentPost?: mongoose.Types.ObjectId;
  isComment: boolean;
  media: IMedia[];
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
      required: true,
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
    parentPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    isComment: {
      type: Boolean,
      default: false,
    },
    media: [mediaSchema], // Tableau de médias (photos/vidéos)
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances des requêtes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ parentPost: 1 });

const Post = mongoose.model<IPost, IPostModel>('Post', postSchema);

export default Post;
