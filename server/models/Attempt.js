// server/models/Attempt.js - COMPLETE FIXED FILE
const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },

  // ─── Answers ───────────────────────────────────────────────────────────────
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedOption: String,
    textAnswer:     String,
    isAnswered:  { type: Boolean, default: false },
    isCorrect:   { type: Boolean, default: false },  // ✅ ADDED
    isFlagged:   { type: Boolean, default: false },
    flagReason:  String,
    isSkipped:   { type: Boolean, default: false },
    timeSpent:   { type: Number,  default: 0 },
    visitCount:  { type: Number,  default: 0 },
    lastVisited: Date
  }],

  // ─── Scoring ───────────────────────────────────────────────────────────────
  score:      { type: Number, default: 0 },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number, default: 0 },

  // ─── Timing ────────────────────────────────────────────────────────────────
  startTime: { type: Date, default: Date.now },
  endTime:   Date,
  timeTaken: Number,   // seconds

  // ─── Status ────────────────────────────────────────────────────────────────
  status: {
    type:    String,
    enum:    ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },

  // ─── Violations ────────────────────────────────────────────────────────────
  // ✅ FIXED enum — must match exactly what frontend sends
  violations: [{
    type: {
      type: String,
      enum: [
        'TAB_SWITCH',
        'WINDOW_BLUR',       // ✅ was BLUR
        'COPY_ATTEMPT',      // ✅ was COPY_PASTE
        'PASTE_ATTEMPT',     // ✅ new
        'DEV_TOOLS',         // ✅ was DEVTOOLS_OPEN
        'FULLSCREEN_EXIT',
        'NO_FACE',
        'MULTIPLE_FACES',
        'RIGHT_CLICK',       // ✅ new
        'TIME_EXPIRED',      // ✅ new
        'IDLE',
        'VOICE_DETECTED'     // ✅ audio monitoring violation
      ]
    },
    weight:    { type: Number, default: 0 },   // ✅ ADDED
    timestamp: { type: Date,   default: Date.now },
    severity: {
      type:    String,
      enum:    ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],  // ✅ ADDED CRITICAL
      default: 'MEDIUM'
    },
    details: String
  }],

  // ✅ FIXED — { type: String } looks like a SchemaType to Mongoose, so wrap it
  violationLog: [{
    type:      { type: String },   // "type" field name wrapped to avoid Mongoose SchemaType confusion
    score:     Number,
    timestamp: Date
  }],

  // ✅ ADDED
  tabSwitchCount: { type: Number, default: 0 },

  suspicionScore: { type: Number, default: 0 },

  // ✅ ADDED
  riskLevel: {
    type:    String,
    enum:    ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  },

  // ─── Auto-submit ───────────────────────────────────────────────────────────
  autoSubmitted:    { type: Boolean, default: false },
  autoSubmitReason: String,

  // ─── Proctoring / Snapshots ────────────────────────────────────────────────
  // ✅ ADDED snapshots array (flat) — controller uses attempt.snapshots
  snapshots: [{
    label:     String,
    filename:  String,
    imageData: String,   // base64-encoded JPEG — survives Render redeploys
    timestamp: { type: Date, default: Date.now }
  }],

  // Keep original proctoring block for face detection logs
  proctoring: {
    referenceImageUrl: String,
    snapshotsUrls:     [String],
    faceDetectionLogs: [{
      timestamp:     Date,
      facesDetected: Number,
      status:        String
    }],
    webcamEnabled:     { type: Boolean, default: false },
    monitoringStarted: Date
  },

  // ─── Student feedback on questions ────────────────────────────────────────
  questionFeedback: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    issue: {
      type: String,
      enum: [
        'WRONG_ANSWER',
        'UNCLEAR_QUESTION',
        'TYPO',
        'MULTIPLE_CORRECT',
        'OTHER'
      ]
    },
    description: String,
    timestamp:   { type: Date, default: Date.now }
  }]

}, { timestamps: true });

// ─── Pre-save: auto-calculate percentage ──────────────────────────────────────
attemptSchema.pre('save', function (next) {
  if (this.score != null && this.totalMarks) {
    this.percentage = Math.round((this.score / this.totalMarks) * 100);
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
attemptSchema.index({ userId: 1, testId: 1 });
attemptSchema.index({ testId: 1, suspicionScore: -1 });

module.exports = mongoose.model('Attempt', attemptSchema);
