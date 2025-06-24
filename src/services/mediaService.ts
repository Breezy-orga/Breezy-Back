import mongoose from "mongoose";
import { Request, Response } from "express";
import { postRepository } from "../repositories/post.repository";


export class MediaService {
  

  static async getMediaById(mediaId: string) {
    try {
      // Ici, vous pouvez ajouter la logique pour récupérer le média par son ID
      // Par exemple, si vous utilisez MongoDB, vous pouvez rechercher un document par son ID
      return { success: true, message: 'Media retrieved successfully', data: { mediaId } };
    } catch (error) {
      console.error('Error retrieving media', { error });
      throw new Error('Failed to retrieve media');
    }
  }
  static async getMediaByPostIdAndIndex(postId: string, mediaIndex: number, req: Request, res: Response) {
    try {
        const index = mediaIndex;
        
        // Validation de l'ID du post
        if (!mongoose.Types.ObjectId.isValid(postId)) {
          throw new Error('ID de post invalide');
        }
        
        // Validation de l'index
        if (isNaN(index) || index < 0) {
          throw new Error('Index de média invalide');
        }
        
        // Récupération du post
        const post = await postRepository.findById(postId);
        
        if (!post) {
          throw new Error('Post non trouvé');
        }
        
        // Vérification de l'existence du média
        if (!post.media || !post.media[index]) {
          throw new Error('Média non trouvé à l\'index spécifié');
        }
        
        const media = post.media[index];
        
        // Vérification de l'existence du base64
        if (!media.base64) {
          throw new Error('Contenu base64 non trouvé');
        }
        
        // Deux options pour servir l'image:
        
        // Option 1: Renvoyer directement la chaîne base64 avec content-type
        if (req.query.format === 'raw') {
        // Extraire le contenu base64 sans le préfixe data:image
        let base64Data = media.base64;
        // Si le base64 inclut déjà le préfixe data:..., on l'enlève
        if (base64Data.includes('base64,')) {
            base64Data = base64Data.split('base64,')[1];
        }
        
        // Convertir en Buffer pour servir en binaire
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Déterminer le content-type
        const contentType = media.contentType || 'image/jpeg';
        
        // Définir les en-têtes
        res.setHeader('Content-Type', String(contentType));
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 an
        
        // Envoyer l'image
        return res.send(buffer);
        }
        
        // Option 2: Renvoyer l'URL data complète prête à être utilisée dans une balise img
        else {
        // S'assurer que le base64 a le bon format avec préfixe data:
        let dataUrl = media.base64;
        
        // Si le base64 n'inclut pas déjà le préfixe, on l'ajoute
        if (!dataUrl.startsWith('data:')) {
            const contentType = media.contentType || 'image/jpeg';
            dataUrl = `data:${contentType};base64,${dataUrl}`;
        }
        
        return res.json({
            dataUrl,
            contentType: media.contentType,
            alt: media.alt || 'Image',
            success: true
        });
        }
    }
    catch (error) {
      console.error('Error retrieving media by post ID and index', { error });
      throw new Error('Failed to retrieve media by post ID and index');
    }
  }

  static async uploadMedia(body: any, ACCEPTED_IMAGE_TYPES: string[], ACCEPTED_VIDEO_TYPES: string[]) {
    const contentType = body.contentType.toLowerCase();

    if (!body.base64 || !body.contentType) {
      throw new Error('Données du média manquantes (base64 ou contentType)');
    }
    
    // Validation du type de média
    const isImage = ACCEPTED_IMAGE_TYPES.includes(contentType);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(contentType);
    
    if (!isImage && !isVideo) {
      throw new Error('Type de média non supporté');
    }

    // Validation de la taille (approximative)
    const base64Size = (body.base64.length * 3) / 4; // approximation en bytes
    const maxSizeImage = 10 * 1024 * 1024; // 10MB pour les images
    const maxSizeVideo = 25 * 1024 * 1024; // 25MB pour les vidéos
    
    const maxSize = isVideo ? maxSizeVideo : maxSizeImage;
    const mediaType = isVideo ? 'Vidéo' : 'Image';
    
    if (base64Size > maxSize) {
      const limiteMB = maxSize / (1024 * 1024);
      throw new Error(`${mediaType} trop volumineux (limite: ${limiteMB}MB)`);
    }

  }

  }
