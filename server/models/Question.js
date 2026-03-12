const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['MCQ', 'True/False'],
    required: true,
    set: function (val) {
      // Normalize type values
      if (!val) return 'MCQ';
      const v = val.toLowerCase();
      if (v === 'multiple_choice' || v === 'mcq') return 'MCQ';
      if (v === 'true_false' || v === 'true/false') return 'True/False';
      return val;
    }
  },
  options: [
    {
      type: String
    }
  ],
  correctAnswer: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    set: function (val) {
      return val ? val.toLowerCase() : 'medium';
    }
  },
  category: {
    type: String,
    default: 'General'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ⚠️ Make sure the model name is EXACTLY 'Question'
module.exports = mongoose.model('Question', questionSchema);
