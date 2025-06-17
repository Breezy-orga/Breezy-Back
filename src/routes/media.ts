import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// Route pour uploader une image (déjà en Base64)
router.post('/upload', authMiddleware, express.json({limit: '16mb'}), async (req: Request, res: Response) => {
  try {
    if (!req.body.base64 || !req.body.contentType) {
      return res.status(400).json({ message: 'Données d\'image manquantes (base64 ou contentType)' });
    }

    // Validation de la taille (approximative)
    const base64Size = (req.body.base64.length * 3) / 4; // approximation en bytes
    if (base64Size > 10 * 1024 * 1024) { // limite à 10MB
      return res.status(400).json({ message: 'Image trop volumineuse (limite: 10MB)' });
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

// Route pour récupérer une image par son nom de fichier
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    // Cette route sera utilisée par le frontend pour obtenir les URLs des images
    // Mais comme les images sont stockées en Base64 dans MongoDB Atlas,
    // cette route n'est pas vraiment nécessaire sauf pour compatibilité avec l'existant
    
    res.status(404).json({ message: 'Image non trouvée. Utilisez la version Base64 stockée avec le post.' });
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
