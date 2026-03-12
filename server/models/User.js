const mongoose = require('mongoose');

// ✅ FIX: Removed the pre('save') bcrypt hook entirely.
// authController.js manually hashes the password before calling User.create().
// Having BOTH the manual hash AND the hook means the password gets hashed twice,
// making every login attempt fail because bcrypt.compare() never matches.

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@ltts\.com$/,
            'Please use a valid @ltts.com email address'
        ]
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'student'],
        default: 'admin'   // portal is admin-only so default to admin
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Helper method — used by authController to verify login
userSchema.methods.matchPassword = async function (enteredPassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
