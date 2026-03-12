const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    studentEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true
    },
    score: {
        type: Number,
        default: 0
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    answers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        selectedOption: {
            type: String
        },
        isCorrect: {
            type: Boolean
        },
        timeSpent: {
            type: Number,
            default: 0
        }
    }],
    tabSwitchCount: {
        type: Number,
        default: 0
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    completed: {
        type: Boolean,
        default: false
    },
    timeTaken: {
        type: Number  // total seconds
    }
}, { timestamps: true });

module.exports = mongoose.model('Attempt', attemptSchema);
