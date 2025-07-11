// src/models/Media.ts
import mongoose, { Document, Model, Schema } from "mongoose";

// Interface pour le média
export interface IMedia extends Document {
  filename: string;
  base64: string;
  contentType: string;
  alt?: string;
}

interface IMediaModel extends Model<IMedia> {
  // Ajoutez ici des méthodes statiques si nécessaire
}

// Définition du schéma Media
// On retire l'option _id:false pour permettre la génération automatique de _id
const mediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true },
    base64: { type: String, required: true },
    contentType: { type: String, required: true },
    alt: { type: String, default: '' },
  }
);

// Création du modèle Media
const Media = mongoose.model<IMedia, IMediaModel>('Media', mediaSchema);

export default Media;
