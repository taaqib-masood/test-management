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

        // One-time migration: drop the stale non-sparse unique index on accessCode.
        // The schema now defines accessCode as sparse+unique so null values are allowed.
        // The old index (without sparse) must be dropped before Mongoose recreates it correctly.
        try {
            await conn.connection.collection('tests').dropIndex('accessCode_1');
            console.log('✅ Dropped stale accessCode_1 index (will be recreated as sparse)');
        } catch (e) {
            // Index doesn't exist or was already dropped — safe to ignore
            if (e.codeName !== 'IndexNotFound') {
                console.log('ℹ️  accessCode_1 index:', e.message);
            }
        }
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
