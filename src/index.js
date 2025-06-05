require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const https = require('https');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://frontend:3000',
  'https://frontend:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Une erreur est survenue', error: err.message });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/breezy')
  .then(() => console.log('Connecté à MongoDB'))
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Start server
const PORT = process.env.PORT || 5000;

// Check if we're in development mode
if (process.env.NODE_ENV === 'development') {
  // In development, use HTTP
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT} (HTTP)`);
  });
} else {
  // In production, use HTTPS
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || '/etc/ssl/private/privkey.pem'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || '/etc/ssl/certs/fullchain.pem')
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT} (HTTPS)`);
  });
} 