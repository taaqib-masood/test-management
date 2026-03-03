const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const connectDB = require('./config/db');
connectDB();

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Simple Root Route
app.get('/', (req, res) => {
    res.send('LTTS Test Portal API is running!');
});

// --- Add login route for frontend ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if(email === 'admin@ltts.com' && password === 'admin123') {
        return res.json({ success: true, token: 'dummy-token' });
    } else {
        return res.status(401).json({ success: false, message: 'Invalid email/password' });
    }
});
// --- End of login route ---

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/attempts', require('./routes/attemptRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
