import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction, Application } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import https from 'https';
import fs from 'fs';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import usersRoutes from './routes/userRoutes/users';
import mediaRoutes from './routes/media';
import themeRoutes from './routes/userRoutes/theme';
import privateMessageRoutes from './routes/privateMessage';
import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './swagger';
import commentRoutes from './routes/comments';
import notificationRoutes from './routes/notifications';
import profileRoutes from './routes/userRoutes/profile';
import followRoutes from './routes/userRoutes/follow';
import moderationRoutes from './routes/moderation';
import adminRoutes from './routes/admin';
import { checkUserStatus } from './middleware/userStatus';

const app: Application = express();

// Middleware
const NODE_ENV: string = process.env.NODE_ENV || 'development';

// CORS configuration
// Configuration sécurisée pour les environnements de développement et de production
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // En développement, autoriser localhost:3000 et 127.0.0.1:3000
    if (NODE_ENV === 'development') {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        console.log('Développement: origine autorisée:', origin || 'sans origine');
        callback(null, true);
        return;
      }
      
      console.warn('CORS refusé pour l\'origine en développement:', origin);
      callback(new Error('Not allowed by CORS'));
      return;
    }
    
    // En production, vérifier les origines autorisées
    const allowedOrigins: string[] = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : [];
    
    // Autoriser les requêtes sans origine (comme les requêtes POSTMAN ou depuis le serveur)
    if (!origin) {
      console.log('Requête sans origine (peut-être une requête côté serveur)');
      callback(null, true);
      return;
    }
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      console.log('Origine autorisée:', origin);
      callback(null, true);
    } else {
      console.warn('CORS refusé pour l\'origine:', origin);
      console.log('Origines autorisées:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Important : autoriser les cookies et les en-têtes d'autorisation
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Cache-Control',
    'Connection',
    'DNT',
    'Origin',
    'Referer',
    'User-Agent',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Date',
    'ETag',
    'X-Powered-By',
    'X-Auth-Token',
    'X-Token-Expiring-Soon',
    'Set-Cookie',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'X-CSRF-Token'
  ],
  maxAge: 86400, // 24 heures pour les pré-vérifications CORS
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Appliquer la configuration CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Activer les requêtes OPTIONS

// Middleware pour parser les cookies
app.use(cookieParser());

// Swagger setup
app.use('/api', checkUserStatus);

// Augmentation de la limite de taille des requêtes JSON à 16MB pour supporter les images en base64
app.use(express.json({ limit: '16mb' }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(requireAuth)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/privateMessages', privateMessageRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
//users route 
app.use('/api/users', usersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/follow', followRoutes);
// Routes de modération
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
interface ErrorWithMessage extends Error {
  stack?: string;
}

app.use((err: ErrorWithMessage, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Une erreur est survenue', error: err.message });
});

// Database connection
// Options Mongoose recommandées pour MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI || '')
  .then(() => {
    console.log('Connecté avec succès à MongoDB Atlas');
  })
  .catch(err => {
    console.error('Erreur de connexion à MongoDB Atlas:', err);
    process.exit(1); // Quitter en cas d'échec de connexion
  });

// Start server
const PORT: number = parseInt(process.env.PORT || '5000', 10);

console.log('ENV DEBUG:', process.env);

if (NODE_ENV === 'development' || process.env.FORCE_HTTP === 'true') {
  // Toujours HTTP en dev
  // Pour la portabilité : écoute sur 0.0.0.0 (toutes interfaces)
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${NODE_ENV}) and accessible on 0.0.0.0`);
    console.log(`Routes de modération disponibles sur http://0.0.0.0:${PORT}/api/moderation`);
  });
} else {
  // Production : HTTPS obligatoire
  try {
    const httpsOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH || '/etc/ssl/private/privkey.pem'),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH || '/etc/ssl/certs/fullchain.pem')
    };
    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT} (HTTPS)`);
      console.log(`Routes de modération disponibles sur https://localhost:${PORT}/api/moderation`);
    });
  } catch (err) {
    console.error('Erreur lors du chargement des certificats SSL:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}