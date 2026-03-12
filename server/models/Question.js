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
    required: true,
    default: 'MCQ',
    set: function (val) {
      if (!val) return 'MCQ';

      const v = val.toLowerCase();

      if (v === 'multiple_choice' || v === 'mcq') return 'MCQ';
      if (v === 'true_false' || v === 'true/false') return 'True/False';

      return 'MCQ'; // fallback to valid enum
    }
  },

  options: {
    type: [String],
    default: []
  },

  correctAnswer: {
    type: String,
    required: true,
    trim: true
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
    default: 'General',
    trim: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure model name is exactly 'Question'
module.exports = mongoose.model('Question', questionSchema);
