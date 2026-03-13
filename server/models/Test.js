const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: Number,
        required: true
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    accessCode: {
        type: String,
        default: null
    },
    showResults: {
        type: Boolean,
        default: true
    },
    allowMultipleAttempts: {
        type: Boolean,
        default: false
    },
    expiryDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    shuffleQuestions: {
        type: Boolean,
        default: false
    },
    shuffleOptions: {
        type: Boolean,
        default: false
    },
    uniqueLink: {
        type: String,
        unique: true,
        sparse: true
    }
}, { timestamps: true });

// ✅ FIX: Use async pre-save without 'next' parameter
// The old version used function(next) but called next() incorrectly in some
// Mongoose versions — switching to async avoids "next is not a function" error
testSchema.pre('save', async function () {
    if (!this.uniqueLink) {
        this.uniqueLink = Math.random().toString(36).substring(2, 10);
    }
});

module.exports = mongoose.model('Test', testSchema);
