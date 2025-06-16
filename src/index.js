require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const https = require('https');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger'); // ton fichier swagger.js

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const PrivateMessages = require('./routes/privateMessage');


const app = express();

// Middleware
let NODE_ENV = process.env.NODE_ENV || 'development';

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
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [];
  app.use(cors({
    origin: function(origin, callback) {
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
app.use('/api/private-messages', PrivateMessages);

//swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something wrong happend', error: err.message });
});



// Database connection
mongoose.connect(process.env.MONGODB_URI || 'localhost:27017/breezy')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Start server
const PORT = process.env.PORT || 5000;

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
      console.log(`Server running on port ${PORT} (HTTPS)`);
    });
  } catch (err) {
    console.error('Error loading SSL certificates:', err.message);
    process.exit(1);
  }
}