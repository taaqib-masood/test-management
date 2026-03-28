// server/models/Test.js

const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  // Optional scoring fields (not required — controller uses per-question marks)
  totalMarks: {
    type: Number,
    default: 0
  },
  passingMarks: {
    type: Number,
    default: 0
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  // Total question count (denormalised for quick access)
  totalQuestions: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessCode: {
    type: String,
    default: null   // null = no access code; no uniqueness constraint needed
  },
  // Unique shareable link token
  uniqueLink: {
    type: String,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
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
  tabSwitchLimit: {
    type: Number,
    default: 3   // 0 = off, -1 = block, N = auto-submit after N switches
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },

  // Anti-cheating configuration
  antiCheating: {
    enabled:               { type: Boolean, default: true },
    fullscreenEnforced:    { type: Boolean, default: true },
    maxTabSwitches:        { type: Number,  default: 3 },
    autoSubmitOnViolation: { type: Boolean, default: true },
    copyPasteBlocked:      { type: Boolean, default: true },
    devToolsDetection:     { type: Boolean, default: true },
    webcamRequired:        { type: Boolean, default: false },
    continuousMonitoring:  { type: Boolean, default: false }
  },

  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  shuffleOptions: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: true
  },
  allowReview: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate unique link token on creation
testSchema.pre('save', async function (next) {
  if (!this.uniqueLink) {
    this.uniqueLink = Math.random().toString(36).substring(2, 10) +
                      Math.random().toString(36).substring(2, 6);
  }
  next();
});

module.exports = mongoose.model('Test', testSchema);
