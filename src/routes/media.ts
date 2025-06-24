import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth';
import Post from '../models/Post';
import { MediaService } from '../services/mediaService';

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
    const body = req.body
    MediaService.uploadMedia(body, ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES);
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
    const postId = req.params.postId;
    const mediaIndex = parseInt(req.params.mediaIndex, 10);
    
    const result = await MediaService.getMediaByPostIdAndIndex(postId, mediaIndex, req, res);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'ID de post invalide':
          return res.status(400).json({ message: error.message });
        case 'Index de média invalide':
          return res.status(400).json({ message: error.message });
        case 'Post non trouvé':
          return res.status(404).json({ message: error.message });
        case 'Média non trouvé à l\'index spécifié':
          return res.status(404).json({ message: error.message });
        case 'Contenu base64 non trouvé':
          return res.status(404).json({ message: error.message });
        default:
          return res.status(500).json({ message: 'Erreur serveur', error: error.message });
      }
    }
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
