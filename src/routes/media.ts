import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth';
import Post from '../models/Post';

const router = express.Router();

// Liste des types MIME acceptés
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg'
];

// Route pour uploader un média (image ou vidéo en Base64)
router.post('/upload', authMiddleware, express.json({limit: '16mb'}), async (req: Request, res: Response) => {
  try {
    if (!req.body.base64 || !req.body.contentType) {
      return res.status(400).json({ message: 'Données du média manquantes (base64 ou contentType)' });
    }
    
    // Validation du type de média
    const contentType = req.body.contentType.toLowerCase();
    const isImage = ACCEPTED_IMAGE_TYPES.includes(contentType);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(contentType);
    
    if (!isImage && !isVideo) {
      return res.status(400).json({ 
        message: 'Type de média non supporté', 
        acceptedTypes: [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]
      });
    }

    // Validation de la taille (approximative)
    const base64Size = (req.body.base64.length * 3) / 4; // approximation en bytes
    const maxSizeImage = 10 * 1024 * 1024; // 10MB pour les images
    const maxSizeVideo = 25 * 1024 * 1024; // 25MB pour les vidéos
    
    const maxSize = isVideo ? maxSizeVideo : maxSizeImage;
    const mediaType = isVideo ? 'Vidéo' : 'Image';
    
    if (base64Size > maxSize) {
      const limiteMB = maxSize / (1024 * 1024);
      return res.status(400).json({ 
        message: `${mediaType} trop volumineux (limite: ${limiteMB}MB)` 
      });
    }

    // Génération du nom de fichier unique
    const filename = `${Date.now()}-${uuidv4().substring(0, 8)}`;
    
    // Retourne les informations nécessaires pour stocker dans un post
    res.json({
      filename,
      contentType: req.body.contentType,
      base64: req.body.base64,
      success: true
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'upload d\'image', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route pour récupérer un média par l'ID du post et l'index du média
router.get('/post/:postId/media/:mediaIndex', async (req: Request, res: Response) => {
  console.log(`DEBUG: Accès à l'endpoint média - postId=${req.params.postId}, mediaIndex=${req.params.mediaIndex}`);
  try {
    const { postId, mediaIndex } = req.params;
    const index = parseInt(mediaIndex);
    
    // Validation de l'ID du post
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'ID de post invalide' });
    }
    
    // Validation de l'index
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: 'Index de média invalide' });
    }
    
    // Récupération du post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post non trouvé' });
    }
    
    // Vérification de l'existence du média
    if (!post.media || !post.media[index]) {
      return res.status(404).json({ message: 'Média non trouvé à l\'index spécifié' });
    }
    
    const media = post.media[index];
    
    // Vérification de l'existence du base64
    if (!media.base64) {
      return res.status(404).json({ message: 'Contenu base64 non trouvé' });
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
      res.setHeader('Content-Type', contentType);
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
  } catch (error) {
    console.error('Erreur lors de la récupération du média:', error);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route pour récupérer une image par son nom de fichier (ancienne méthode)
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    // Cette route sera utilisée par le frontend pour obtenir les URLs des images
    // Mais comme les images sont stockées en Base64 dans MongoDB Atlas,
    // cette route n'est pas vraiment nécessaire sauf pour compatibilité avec l'existant
    
    res.status(404).json({ message: 'Image non trouvée. Utilisez la version Base64 stockée avec le post ou la nouvelle route /post/:postId/media/:mediaIndex.' });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'image:', error);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route de debug pour tester l'upload d'image
router.get('/test/upload', (req: Request, res: Response) => {
  res.send(`
    <form id="uploadForm" action="/api/media/upload" method="post">
      <input type="file" id="fileInput">
      <button type="button" onclick="uploadFile()">Upload</button>
    </form>
    <script>
      function uploadFile() {
        const file = document.getElementById('fileInput').files[0];
        if (!file) {
          alert('Sélectionnez un fichier');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
          const base64 = e.target.result;
          fetch('/api/media/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64: base64,
              contentType: file.type
            })
          })
          .then(response => response.json())
          .then(data => alert('Success: ' + JSON.stringify(data)))
          .catch(error => alert('Error: ' + error));
        };
        reader.readAsDataURL(file);
      }
    </script>
  `);
});

export default router;
