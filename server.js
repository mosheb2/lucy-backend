const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import all routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const trackRoutes = require('./routes/tracks');
const releaseRoutes = require('./routes/releases');
const postRoutes = require('./routes/posts');
const analyticsRoutes = require('./routes/analytics');
const collaborationRoutes = require('./routes/collaborations');
const notificationRoutes = require('./routes/notifications');
const storyRoutes = require('./routes/stories');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const base44Routes = require('./routes/base44-functions');
const followsRoutes = require('./routes/follows');
const savedPostsRoutes = require('./routes/saved-posts');
const mentorsRoutes = require('./routes/mentors');
const songRegistrationsRoutes = require('./routes/song-registrations');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://app.lucysounds.com',
      'https://www.app.lucysounds.com',
      'https://lucy-frontend.herokuapp.com',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes

// Add explicit CORS headers for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://app.lucysounds.com',
    'https://www.app.lucysounds.com',
    'https://lucy-frontend.herokuapp.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/tracks', authenticateToken, trackRoutes);
app.use('/api/releases', authenticateToken, releaseRoutes);
app.use('/api/posts', authenticateToken, postRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/collaborations', authenticateToken, collaborationRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/stories', authenticateToken, storyRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/base44', authenticateToken, base44Routes);
app.use('/api/follows', authenticateToken, followsRoutes);
app.use('/api/saved-posts', authenticateToken, savedPostsRoutes);
app.use('/api/mentors', authenticateToken, mentorsRoutes);
app.use('/api/song-registrations', authenticateToken, songRegistrationsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; 