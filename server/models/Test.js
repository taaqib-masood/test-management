const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },

    options: [
        {
            type: String,
            required: true
        }
    ],

    correctAnswer: {
        type: Number,
        required: true
    }
});



const testSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    duration: {
        type: Number,
        required: true
    },

    totalQuestions: {
        type: Number,
        required: true
    },

    accessCode: {
        type: String
    },

    showResults: {
        type: Boolean,
        default: false
    },

    allowMultipleAttempts: {
        type: Boolean,
        default: true
    },

    expiryDate: {
        type: Date,
        default: null
    },

    questions: [questionSchema]

}, {
    timestamps: true
});


module.exports = mongoose.model("Test", testSchema);
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
