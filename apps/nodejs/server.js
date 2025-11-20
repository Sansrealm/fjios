import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
// In development, allow all origins for mobile app testing
// In production, use CORS_ORIGINS environment variable
if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGINS) {
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
      credentials: true,
    })
  );
} else {
  // Development: allow all origins (for mobile app testing)
  app.use(
    cors({
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Authorization', 'x-authorization'],
    })
  );
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Import routes
import authRoutes from './routes/auth/index.js';
import cardsRoutes from './routes/cards/index.js';
import inviteCodesRoutes from './routes/invite-codes/index.js';
import industryTagsRoutes from './routes/industry-tags/index.js';
import messagesRoutes from './routes/messages/index.js';
import savedCardsRoutes from './routes/saved-cards/index.js';
import systemSettingsRoutes from './routes/system-settings/index.js';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/invite-codes', inviteCodesRoutes);
app.use('/api/industry-tags', industryTagsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/saved-cards', savedCardsRoutes);
app.use('/api/system-settings', systemSettingsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

