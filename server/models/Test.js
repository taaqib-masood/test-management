// server/models/Test.js - COMPLETE FILE

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
  totalMarks: {
    type: Number,
    required: true
  },
  passingMarks: {
    type: Number,
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  
  // PHASE 1: Anti-cheating configuration
  antiCheating: {
    enabled: { type: Boolean, default: true },
    fullscreenEnforced: { type: Boolean, default: true },
    maxTabSwitches: { type: Number, default: 3 },
    autoSubmitOnViolation: { type: Boolean, default: true },
    copyPasteBlocked: { type: Boolean, default: true },
    devToolsDetection: { type: Boolean, default: true },
    webcamRequired: { type: Boolean, default: false },
    continuousMonitoring: { type: Boolean, default: false }
  },
  
  // Existing fields
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

// Generate unique access code
testSchema.pre('save', async function(next) {
  if (!this.accessCode) {
    this.accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Test', testSchema);
