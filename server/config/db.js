const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Use MONGODB_URI (consistent with your Render variable)
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ltts';
        
        const conn = await mongoose.connect(uri, {
            dbName: 'ltts', // Explicitly set database name
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📚 Using database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
