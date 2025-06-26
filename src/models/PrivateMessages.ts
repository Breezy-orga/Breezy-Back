import mongoose, { Document, Schema } from 'mongoose';

// 1. Interface TypeScript
export interface IPrivateMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
}

// 2. Schema Mongoose
const privateMessageSchema = new Schema<IPrivateMessage>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// 3. Modèle Mongoose
const PrivateMessage = mongoose.model<IPrivateMessage>('PrivateMessage', privateMessageSchema);

// 4. Export
export default PrivateMessage;

