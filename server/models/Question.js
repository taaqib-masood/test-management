const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['MCQ', 'True/False'],
        default: 'MCQ',
        // Normalise whatever the Excel file sends
        set: function (val) {
            if (!val) return 'MCQ';
            const v = val.toLowerCase().trim();
            if (v === 'multiple_choice' || v === 'mcq') return 'MCQ';
            if (v === 'true_false' || v === 'true/false' || v === 'truefalse') return 'True/False';
            return 'MCQ';
        }
    },
    options: {
        type: [String],
        default: []
    },
    correctAnswer: {
        type: String,   // ✅ Always a String — matches what the controller compares
        required: true,
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
        set: function (val) {
            return val ? val.toLowerCase().trim() : 'medium';
        }
    },
    category: {
        type: String,
        default: 'General',
        trim: true
    },
    // ✅ FIX: removed required:true — controllers don't set createdBy, causing every insert to fail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
