const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = require('./config/db');
connectDB();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/attempts', require('./routes/attemptRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist/client/browser')));
} else {
    app.get('/', (req, res) => {
        res.send('LTTS Test Portal API is running!');
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
