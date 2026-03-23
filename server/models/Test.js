// ==============================
// server/models/Test.js
// ==============================
const mongoose = require('mongoose');
const crypto = require('crypto');

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
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  shuffleOptions: {
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
  uniqueLink: {
    type: String,
    unique: true
  },

  // ── NEW: max tab switches allowed before auto-submit (0 = disabled / unlimited)
  tabSwitchLimit: {
    type: Number,
    default: 3,
    min: 0
  }

}, { timestamps: true });

// Auto-generate uniqueLink before saving if not already set
testSchema.pre('save', async function () {
  if (!this.uniqueLink) {
    this.uniqueLink = crypto.randomBytes(4).toString('hex');
  }
});

module.exports = mongoose.model('Test', testSchema);
