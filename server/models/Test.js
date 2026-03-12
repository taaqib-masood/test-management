const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    title: { type: String, required: true },

    duration: { type: Number, required: true },

    totalQuestions: { type: Number, required: true },

    accessCode: { type: String },

    showResults: { type: Boolean, default: false },

    allowMultipleAttempts: { type: Boolean, default: true },

    expiryDate: { type: Date, default: null },

    uniqueLink: {
        type: String,
        unique: true,
        default: () => Math.random().toString(36).substring(2,10)
    },

    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    shuffleQuestions: { type: Boolean, default: false },

    shuffleOptions: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Test', testSchema);        ref: 'Question'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    shuffleQuestions: {
        type: Boolean,
        default: false
    },
    shuffleOptions: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Test', testSchema);
