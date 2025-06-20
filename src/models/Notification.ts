import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';

export interface INotification extends Document {
  recipient: IUser['_id'];
  sender: IUser['_id'];
  type: 'mention' | 'like' | 'follow' | 'comment';
  post?: IPost['_id'];
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['mention', 'like', 'follow', 'comment'],
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    read: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', notificationSchema);
