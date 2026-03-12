const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    options: [String],
    correctAnswer: Number
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
        type: Date
    },

    isActive: {
        type: Boolean,
        default: true
    },

    questions: [questionSchema]

}, { timestamps: true });


module.exports = mongoose.model("Test", testSchema);
