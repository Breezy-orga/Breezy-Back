import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction, Application } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import https from 'https';
import fs from 'fs';

import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import userRoutes from './routes/users';
import mediaRoutes from './routes/media';

const app: Application = express();

// Middleware
const NODE_ENV: string = process.env.NODE_ENV || 'development';

// CORS configuration
// CORS dynamique et portable
if (NODE_ENV === 'development') {
  // En dev : autorise tout
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.options('*', cors());
} else {
  // En prod : autorise uniquement le(s) domaine(s) frontend déclarés
  // FRONTEND_URL peut être une liste séparée par des virgules
  const allowedOrigins: string[] = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [];
  app.use(cors({
    origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('CORS refused for origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.options('*', cors());
}

app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);

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
    });
  } catch (err) {
    console.error('Erreur lors du chargement des certificats SSL:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
