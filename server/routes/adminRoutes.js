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

    const recentAttempts = allAttempts.slice(0, 10).map(a => ({
      _id:        a._id,
      student:    a.userId?.name  || 'Unknown',
      email:      a.userId?.email || '',
      testTitle:  a.testId?.title || 'Unknown Test',
      score:      a.score,
      percentage: a.percentage || 0,
      riskLevel:  a.riskLevel  || 'LOW',
      createdAt:  a.createdAt
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
