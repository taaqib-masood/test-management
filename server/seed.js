const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
    try {
        await User.deleteMany();

        const adminUser = new User({
            name: 'Admin',
            email: 'admin@ltts.com',
            password: 'admin123',
            role: 'admin'
        });

        await adminUser.save();

        console.log('Admin seeded: admin@ltts.com / admin123');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
