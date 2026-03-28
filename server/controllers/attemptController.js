const Attempt  = require('../models/Attempt');
const Test     = require('../models/Test');
const User     = require('../models/User');
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

// ─── Multer setup for snapshots ───────────────────────────────────────────────
const snapshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/snapshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.attemptId}_${Date.now()}.jpg`);
  }
});
const snapshotUpload = multer({ storage: snapshotStorage });
exports.snapshotUpload = snapshotUpload; // used in routes

// ═══════════════════════════════════════════════════════════════════════════════
//  CREATE ATTEMPT
// ═══════════════════════════════════════════════════════════════════════════════

exports.createAttempt = async (req, res) => {
  try {
    const { userId, testId } = req.body;

    const test = await Test.findById(testId).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Return existing in-progress attempt if any
    const existing = await Attempt.findOne({ userId, testId, status: 'in-progress' });
    if (existing) return res.json({ success: true, attempt: existing });

    const totalMarks = test.totalMarks || test.questions?.length || 1;

    const attempt = new Attempt({
      userId,
      testId,
      totalMarks,
      startTime:      new Date(),
      status:         'in-progress',
      suspicionScore: 0,
      violationLog:   [],
      violations:     [],
      tabSwitchCount: 0,
      answers:        []
    });

    await attempt.save();
    res.json({ success: true, attempt });

  } catch (err) {
    console.error('createAttempt error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  START ATTEMPT  (student entry — finds/creates user then creates attempt)
//  Frontend POSTs: { testId, studentName, studentEmail, accessCode? }
// ═══════════════════════════════════════════════════════════════════════════════

exports.startAttempt = async (req, res) => {
  try {
    const { testId, studentName, studentEmail, accessCode } = req.body;

    if (!testId || !studentName || !studentEmail) {
      return res.status(400).json({ message: 'testId, studentName and studentEmail are required' });
    }

    const test = await Test.findById(testId).populate('questions');
    if (!test)           return res.status(404).json({ message: 'Test not found' });
    if (!test.isActive)  return res.status(400).json({ message: 'This test is not active' });

    if (test.expiryDate && new Date() > new Date(test.expiryDate)) {
      return res.status(400).json({ message: 'This test has expired' });
    }

    // Validate access code if required
    if (test.accessCode && test.accessCode.trim()) {
      if (!accessCode || accessCode.trim() !== test.accessCode.trim()) {
        return res.status(400).json({ message: 'Invalid access code' });
      }
    }

    // Find or create student user
    let user = await User.findOne({ email: studentEmail.toLowerCase().trim() });
    if (!user) {
      const hashed = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
      user = await User.create({
        name:     studentName.trim(),
        email:    studentEmail.toLowerCase().trim(),
        password: hashed,
        role:     'student'
      });
    }

    // Return existing in-progress attempt
    const existing = await Attempt.findOne({ userId: user._id, testId, status: 'in-progress' });
    if (existing) return res.json({ _id: existing._id, success: true, attempt: existing });

    // Block retakes if not allowed
    if (!test.allowMultipleAttempts) {
      const done = await Attempt.findOne({ userId: user._id, testId, status: 'completed' });
      if (done) return res.status(400).json({ message: 'You have already completed this test' });
    }

    const totalMarks = test.totalMarks || test.questions?.length || 1;

    const attempt = new Attempt({
      userId:         user._id,
      testId,
      totalMarks,
      startTime:      new Date(),
      status:         'in-progress',
      suspicionScore: 0,
      violationLog:   [],
      violations:     [],
      tabSwitchCount: 0,
      answers:        []
    });

    await attempt.save();
    res.json({ _id: attempt._id, success: true, attempt });

  } catch (err) {
    console.error('startAttempt error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GET ATTEMPT
//  ✅ FIX: frontend reads attempt.test, attempt.startTime, attempt.answers etc.
//          directly — so return the attempt at root level, not nested
// ═══════════════════════════════════════════════════════════════════════════════

exports.getAttempt = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('userId',  'name email')
      .populate('testId');

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // ✅ Frontend expects: attempt.test, attempt.startTime, attempt.answers
    // Mongoose stores testId but frontend reads .test — map it
    const result = attempt.toObject();
    result.test      = result.testId;   // alias for frontend
    result.startTime = result.startTime || result.createdAt;

    res.json(result);   // ✅ root-level, not wrapped in { success, attempt }

  } catch (err) {
    console.error('getAttempt error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SAVE PROGRESS  (auto-save every 10s from frontend)
//  ✅ NEW — was completely missing, causing PUT /:id/save to 404
// ═══════════════════════════════════════════════════════════════════════════════

exports.saveProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, tabSwitchCount, suspicionScore, violationLog } = req.body;

    // Build only the fields that were actually sent
    const fields = {};
    if (answers        !== undefined) fields.answers        = answers;
    if (tabSwitchCount !== undefined) fields.tabSwitchCount = tabSwitchCount;
    if (suspicionScore !== undefined) fields.suspicionScore = suspicionScore;
    if (violationLog   !== undefined) fields.violationLog   = violationLog;

    // findOneAndUpdate is atomic — no version conflict with concurrent submitAttempt
    const attempt = await Attempt.findOneAndUpdate(
      { _id: id, status: 'in-progress' },
      { $set: fields },
      { new: false }
    );

    if (!attempt) {
      // Either not found or already completed — both are fine, nothing to save
      return res.json({ success: true, message: 'Already submitted or not found' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error('saveProgress error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBMIT ATTEMPT
//  ✅ FIX: now saves suspicionScore, violationLog, tabSwitchCount, autoSubmitted
// ═══════════════════════════════════════════════════════════════════════════════

exports.submitAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('=== SUBMIT ATTEMPT CALLED ===');
    console.log('Params:', req.params);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('User:', req.user || null);
    console.log('Headers auth:', req.headers.authorization ? 'PRESENT' : 'MISSING');
    console.log('AttemptId value:', id, '| type:', typeof id);

    const {
      answers,
      autoSubmitted,
      tabSwitchCount,
      suspicionScore,
      violationLog
    } = req.body;

    const attempt = await Attempt.findById(id);
    console.log('Attempt lookup:', attempt ? `found (status=${attempt.status})` : 'NOT FOUND');
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // Prevent double-submit
    if (attempt.status === 'completed') {
      console.log('Attempt already completed — returning cached result');
      return res.json({ success: true, attempt, score: attempt.score });
    }

    const test = await Test.findById(attempt.testId).populate('questions');
    console.log('Test lookup:', test ? `found (${test.questions?.length} questions)` : 'NOT FOUND');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Filter out null entries (deleted questions still referenced by test)
    const validQuestions = (test.questions || []).filter(q => q != null);

    // ─── Ensure totalMarks is set (fallback to question count) ───────────────
    if (!attempt.totalMarks || attempt.totalMarks === 0) {
      attempt.totalMarks = test.totalMarks || validQuestions.length || 1;
    }

    // ─── Grade answers ────────────────────────────────────────────────────────
    let score = 0;
    const gradedAnswers = (answers || []).map(userAnswer => {
      const question = validQuestions.find(
        q => q._id.toString() === userAnswer.questionId
      );
      const isCorrect = question
        ? userAnswer.selectedOption === question.correctAnswer
        : false;
      if (isCorrect) score += question.marks || 1;

      return {
        questionId:     userAnswer.questionId,
        selectedOption: userAnswer.selectedOption || null,
        isAnswered:     !!userAnswer.selectedOption,
        timeSpent:      userAnswer.timeSpent || 0,
        isCorrect
      };
    });

    // ─── Calculate risk level ─────────────────────────────────────────────────
    const finalScore = suspicionScore || attempt.suspicionScore || 0;
    const riskLevel  =
      finalScore >= 71 ? 'HIGH'   :
      finalScore >= 31 ? 'MEDIUM' : 'LOW';

    // ─── Persist everything atomically (no version conflict with auto-save) ────
    const endTime   = new Date();
    const timeTaken = Math.floor((endTime - attempt.startTime) / 1000);
    const percentage = attempt.totalMarks
      ? Math.round((score / attempt.totalMarks) * 100)
      : 0;

    const saved = await Attempt.findOneAndUpdate(
      { _id: id, status: 'in-progress' },
      {
        $set: {
          answers:        gradedAnswers,
          score,
          percentage,
          endTime,
          timeTaken,
          status:         'completed',
          autoSubmitted:  autoSubmitted  ?? false,
          tabSwitchCount: tabSwitchCount ?? attempt.tabSwitchCount ?? 0,
          suspicionScore: finalScore,
          violationLog:   violationLog   ?? attempt.violationLog   ?? [],
          riskLevel
        }
      },
      { new: true, runValidators: false }
    );

    if (!saved) {
      // Already completed by a concurrent request — idempotent success
      const existing = await Attempt.findById(id);
      return res.json({ success: true, attempt: existing, score: existing?.score ?? 0 });
    }

    res.json({
      success:    true,
      attempt:    saved,
      score,
      riskLevel,
      suspicionScore: finalScore,
      percentage
    });

  } catch (err) {
    console.error('submitAttempt error:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  LOG VIOLATION  (called immediately on every violation from frontend)
//  ✅ FIX: uses weight+suspicionScore from frontend instead of recalculating
// ═══════════════════════════════════════════════════════════════════════════════

exports.logViolation = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { type, weight, suspicionScore, timestamp } = req.body;

    const violation = {
      type,
      weight:    weight || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      severity:  getSeverity(type)
    };

    // Build atomic update — $push + $inc avoids VersionError from concurrent violations
    const update = {
      $push: { violations: violation }
    };

    // Trust the frontend's suspicion score
    if (suspicionScore !== undefined) {
      update.$set = { suspicionScore };
    }

    // $inc is safer than $set for a counter incremented by concurrent requests
    if (type === 'TAB_SWITCH') {
      update.$inc = { tabSwitchCount: 1 };
    }

    const attempt = await Attempt.findOneAndUpdate(
      { _id: attemptId, status: 'in-progress' },
      update,
      { new: true, runValidators: false }
    );

    if (!attempt) {
      return res.json({ success: true, message: 'Already submitted' });
    }

    const shouldAutoSubmit = attempt.suspicionScore >= 100;

    res.json({
      success:        true,
      suspicionScore: attempt.suspicionScore,
      shouldAutoSubmit,
      violationCount: attempt.violations.length
    });

  } catch (err) {
    console.error('logViolation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  UPLOAD SNAPSHOT  (webcam captures)
//  ✅ NEW — was completely missing
// ═══════════════════════════════════════════════════════════════════════════════

exports.uploadSnapshot = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const label         = req.body.label || 'PERIODIC';

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    attempt.snapshots = attempt.snapshots || [];
    attempt.snapshots.push({
      label,
      filename:  req.file.filename,
      path:      req.file.path,
      timestamp: new Date()
    });

    await attempt.save();
    res.json({ success: true, filename: req.file.filename });

  } catch (err) {
    console.error('uploadSnapshot error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GET USER ATTEMPTS
// ═══════════════════════════════════════════════════════════════════════════════

exports.getUserAttempts = async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.params.userId })
      .populate('testId', 'title duration totalMarks')
      .sort({ createdAt: -1 });

    res.json({ success: true, attempts });

  } catch (err) {
    console.error('getUserAttempts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GET TEST ATTEMPTS  (for proctoring dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

exports.getTestAttempts = async (req, res) => {
  try {
    const attempts = await Attempt.find({ testId: req.params.testId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, attempts });

  } catch (err) {
    console.error('getTestAttempts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  UPDATE ANSWER
// ═══════════════════════════════════════════════════════════════════════════════

exports.updateAnswer = async (req, res) => {
  try {
    const { attemptId, questionId }                              = req.params;
    const { selectedOption, textAnswer, isFlagged, isSkipped }   = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    let idx = attempt.answers.findIndex(
      a => a.questionId?.toString() === questionId
    );

    if (idx === -1) {
      attempt.answers.push({
        questionId,
        isAnswered:  false,
        visitCount:  0,
        lastVisited: new Date()
      });
      idx = attempt.answers.length - 1;
    }

    const ans = attempt.answers[idx];

    if (selectedOption !== undefined) {
      ans.selectedOption = selectedOption;
      ans.isAnswered     = !!selectedOption;
      ans.isSkipped      = false;
    }
    if (textAnswer   !== undefined) { ans.textAnswer = textAnswer; ans.isAnswered = !!textAnswer; }
    if (isFlagged    !== undefined) { ans.isFlagged  = isFlagged; }
    if (isSkipped    !== undefined) { ans.isSkipped  = isSkipped; if (isSkipped) ans.isAnswered = false; }

    ans.visitCount  = (ans.visitCount || 0) + 1;
    ans.lastVisited = new Date();

    await attempt.save();
    res.json({ success: true, answer: ans });

  } catch (err) {
    console.error('updateAnswer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SUBMIT QUESTION FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

exports.submitQuestionFeedback = async (req, res) => {
  try {
    const { attemptId }                  = req.params;
    const { questionId, issue, description } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    attempt.questionFeedback = attempt.questionFeedback || [];
    const existing = attempt.questionFeedback.find(
      f => f.questionId?.toString() === questionId
    );

    if (existing) {
      existing.issue       = issue;
      existing.description = description;
      existing.timestamp   = new Date();
    } else {
      attempt.questionFeedback.push({ questionId, issue, description, timestamp: new Date() });
    }

    await attempt.save();
    res.json({ success: true });

  } catch (err) {
    console.error('submitQuestionFeedback error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GET ATTEMPT PROGRESS
// ═══════════════════════════════════════════════════════════════════════════════

exports.getAttemptProgress = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('testId', 'title questions');

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    const total    = attempt.testId?.questions?.length || 0;
    const answered = attempt.answers.filter(a => a.isAnswered).length;
    const flagged  = attempt.answers.filter(a => a.isFlagged).length;
    const skipped  = attempt.answers.filter(a => a.isSkipped).length;

    res.json({
      success: true,
      progress: {
        total,
        answered,
        flagged,
        skipped,
        unanswered:      total - answered,
        percentComplete: total ? Math.round((answered / total) * 100) : 0
      }
    });

  } catch (err) {
    console.error('getAttemptProgress error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getSeverity(type) {
  const map = {
    DEV_TOOLS:       'CRITICAL',
    TAB_SWITCH:      'CRITICAL',
    COPY_ATTEMPT:    'HIGH',
    PASTE_ATTEMPT:   'HIGH',
    MULTIPLE_FACES:  'HIGH',
    NO_FACE:         'HIGH',
    FULLSCREEN_EXIT: 'HIGH',
    WINDOW_BLUR:     'MEDIUM',
    RIGHT_CLICK:     'LOW',
  };
  return map[type] || 'MEDIUM';
}
