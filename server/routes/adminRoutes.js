// server/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const Test     = require('../models/Test');
const Attempt  = require('../models/Attempt');
const Question = require('../models/Question');
const xlsx     = require('xlsx');

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const [totalTests, totalQuestions, allAttempts] = await Promise.all([
      Test.countDocuments(),
      Question.countDocuments(),
      Attempt.find({ status: 'completed' })
        .populate('userId', 'name email')
        .populate('testId', 'title')
        .sort({ createdAt: -1 })
    ]);

    const uniqueStudentIds = new Set(
      allAttempts.map(a => a.userId?._id?.toString()).filter(Boolean)
    );

    const avgScore = allAttempts.length > 0
      ? Math.round(allAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / allAttempts.length)
      : 0;

    // Debug: log first attempt's userId populate result
    if (allAttempts.length > 0) {
      const first = allAttempts[0];
      console.log('=== STATS DEBUG ===');
      console.log('First attempt userId raw:', first.userId);
      console.log('First attempt userId type:', typeof first.userId);
      console.log('First attempt name:', first.userId?.name);
    }

    const recentAttempts = allAttempts.slice(0, 10).map(a => ({
      _id:            a._id,
      studentName:    a.userId?.name  || 'Unknown',
      email:          a.userId?.email || '',
      test:           { title: a.testId?.title || 'Unknown Test' },
      score:          a.score         || 0,
      totalQuestions: a.totalMarks    || 0,
      percentage:     a.percentage    || 0,
      riskLevel:      a.riskLevel     || 'LOW',
      createdAt:      a.createdAt
    }));

    res.json({
      totalTests,
      uniqueStudents: uniqueStudentIds.size,
      totalAttempts:  allAttempts.length,
      avgScore,
      totalQuestions,
      recentAttempts
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/admin/tests/:id/results ────────────────────────────────────────
router.get('/tests/:id/results', protect, admin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const attempts = await Attempt.find({ testId: req.params.id, status: 'completed' })
      .populate('userId', 'name email')
      .sort({ score: -1, timeTaken: 1 });

    const formattedAttempts = attempts.map(a => ({
      _id:           a._id,
      studentName:   a.userId?.name  || 'Unknown',
      studentEmail:  a.userId?.email || '',
      score:         a.score         || 0,
      totalQuestions: a.totalMarks   || test.totalQuestions || test.questions?.length || 0,
      percentage:    a.percentage    || 0,
      timeTaken:     a.timeTaken     || 0,
      tabSwitchCount: a.tabSwitchCount || 0,
      suspicionScore: a.suspicionScore || 0,
      riskLevel:     a.riskLevel     || 'LOW',
      autoSubmitted: a.autoSubmitted || false,
      endTime:       a.endTime,
      answers:       a.answers       || []
    }));

    res.json({ test, attempts: formattedAttempts });
  } catch (err) {
    console.error('Results error:', err);
    res.status(500).json({ message: 'Error fetching results' });
  }
});

// ─── GET /api/admin/tests/:id/export ─────────────────────────────────────────
router.get('/tests/:id/export', protect, admin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const attempts = await Attempt.find({ testId: req.params.id, status: 'completed' })
      .populate('userId', 'name email')
      .sort({ score: -1 });

    const data = attempts.map((a, i) => ({
      'Rank':             i + 1,
      'Name':             a.userId?.name  || 'Unknown',
      'Email':            a.userId?.email || '',
      'Score':            a.score         || 0,
      'Total Questions':  a.totalMarks    || test.totalQuestions || 0,
      'Percentage':       a.percentage    || 0,
      'Time Taken (s)':   a.timeTaken     || 0,
      'Tab Switches':     a.tabSwitchCount || 0,
      'Risk Level':       a.riskLevel     || 'LOW',
      'Auto Submitted':   a.autoSubmitted ? 'Yes' : 'No',
      'Submitted At':     a.endTime ? new Date(a.endTime).toISOString() : ''
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Results');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${test.title}_results.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Error exporting results' });
  }
});

// ─── GET /api/admin/sample-template ─────────────────────────────────────────
router.get('/sample-template', protect, admin, (req, res) => {
  try {
    const templateData = [
      {
        question:    'What does HTML stand for?',
        type:        'MCQ',
        options:     'Hyper Text Markup Language|Hyper Transfer Markup Language|High Text Markup Language|Hyper Text Making Language',
        rect_answ:   'Hyper Text Markup Language',
        difficulty:  'easy',
        category:    'Web Development'
      },
      {
        question:    'JavaScript is a compiled language.',
        type:        'True/False',
        options:     'True|False',
        rect_answ:   'False',
        difficulty:  'easy',
        category:    'Programming'
      },
      {
        question:    'Which data structure uses LIFO order?',
        type:        'MCQ',
        options:     'Queue|Stack|Array|LinkedList',
        rect_answ:   'Stack',
        difficulty:  'medium',
        category:    'Data Structures'
      }
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Questions');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="question_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Sample template error:', err);
    res.status(500).json({ message: 'Error generating template' });
  }
});

module.exports = router;
