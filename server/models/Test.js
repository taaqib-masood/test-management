const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: Number,
        required: true  // in minutes
    },
    // ✅ FIX: questions must be ObjectId refs to Question model, NOT embedded subdocuments
    // Embedded subdocs can't be populated and break the entire question-loading flow
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
        sparse: true  // allows null without unique conflict
    }
}, { timestamps: true });

// Auto-generate uniqueLink before saving if not set
testSchema.pre('save', function (next) {
    if (!this.uniqueLink) {
        this.uniqueLink = Math.random().toString(36).substring(2, 10);
    }
    next();
});

module.exports = mongoose.model('Test', testSchema);
