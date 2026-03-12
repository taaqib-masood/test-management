// ==============================
// server.js
// ==============================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==============================
// Middleware
// ==============================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================
// Database Connection
// ==============================
const connectDB = require('./config/db');
connectDB();

// ==============================
// Health Check
// ==============================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime()
  });
});

// ==============================
// Root Route
// ==============================
app.get('/', (req, res) => {
  res.send('LTTS Test Portal API is running!');
});

// ==============================
// API Routes
// ==============================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/attempts', require('./routes/attemptRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ==============================
// 404 Handler (unknown routes)
// ==============================
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ==============================
// Global Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists` });
  }

  res.status(500).json({ message: err.message || 'Internal server error' });
});

// ==============================
// Start Server
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
