import mongoose, { Model, Schema } from "mongoose";

// Interface pour le média
export interface IMedia {
  filename?: string;
  base64?: string;
  contentType?: string;
  alt?: string;
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


export default Media;