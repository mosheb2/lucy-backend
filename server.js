const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

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

const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'https://app.lucysounds.com', 'http://localhost:5173'],
  credentials: true
}));
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
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 