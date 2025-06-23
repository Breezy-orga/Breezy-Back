import mongoose, { Document, Model, Schema } from "mongoose";

// Interface pour le média
export interface IMedia extends Document {
  filename?: String;
  base64?: String;
  contentType?: String;
  alt?: String;
}

interface IMediaModel extends Model<IMedia> {
  // Ajoutez ici des méthodes statiques si nécessaire
}

const mediaSchema = new Schema<IMedia>(
  {
    filename: String,
    base64: String,
    contentType: String,
    alt: String,
  },
  { _id: false }
);

const Media = mongoose.model<IMedia, IMediaModel>('Media', mediaSchema);


export default mediaSchema;