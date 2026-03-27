const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS Configuration - CRITICAL FOR YOUR SETUP
app.use(cors({
  origin: 'https://test-management-frontend-3.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✓ Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const attemptRoutes = require('./routes/attemptRoutes');

let proctoringRoutes, adminRoutes, questionRoutes;

try {
  proctoringRoutes = require('./routes/proctoringRoutes');
  console.log('✓ Proctoring routes loaded');
} catch (e) {
  console.log('⚠️ Proctoring routes not found');
}

try {
  adminRoutes = require('./routes/adminRoutes');
  console.log('✓ Admin routes loaded');
} catch (e) {
  console.log('⚠️ Admin routes not found');
}

try {
  questionRoutes = require('./routes/questionRoutes');
  console.log('✓ Question routes loaded');
} catch (e) {
  console.log('⚠️ Question routes not found');
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/attempts', attemptRoutes);

if (questionRoutes) {
  app.use('/api/questions', questionRoutes);
}

if (proctoringRoutes) {
  app.use('/api/proctoring', proctoringRoutes);
}

if (adminRoutes) {
  app.use('/api/admin', adminRoutes);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    routes: {
      auth: true,
      tests: true,
      attempts: true,
      questions: !!questionRoutes,
      proctoring: !!proctoringRoutes,
      admin: !!adminRoutes
    }
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'LTTS Test Management API',
    frontend: 'https://test-management-frontend-3.onrender.com'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Frontend URL: https://test-management-frontend-3.onrender.com`);
});

module.exports = app;
