const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const { protect, admin } = require('../middleware/authMiddleware');
const Attempt = require('../models/Attempt');
const Test = require('../models/Test');
const Question = require('../models/Question');

// GET /api/admin/stats
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalTests = await Test.countDocuments();
    const tests = await Test.find();
    const testIds = tests.map(t => t._id);

    const completedAttempts = await Attempt.find({ test: { $in: testIds }, completed: true });
    const totalAttempts = completedAttempts.length;
    const uniqueStudents = [...new Set(completedAttempts.map(a => a.studentEmail))].length;

    const avgScore = totalAttempts > 0
      ? parseFloat((completedAttempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions * 100), 0) / totalAttempts).toFixed(1))
      : 0;

    const totalQuestions = await Question.countDocuments();

    const recentAttempts = await Attempt.find({ test: { $in: testIds }, completed: true })
      .sort({ endTime: -1 })
      .limit(10)
      .populate('test', 'title');

    res.json({ totalTests, uniqueStudents, totalAttempts, avgScore, totalQuestions, recentAttempts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// GET /api/admin/tests/:testId/results
router.get('/tests/:testId/results', protect, admin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const attempts = await Attempt.find({ test: req.params.testId, completed: true })
      .sort({ score: -1, timeTaken: 1 });

    res.json({
      test: {
        _id: test._id,
        title: test.title,
        duration: test.duration,
        totalQuestions: test.questions.length,
        questions: test.questions,
        showResults: test.showResults,
        uniqueLink: test.uniqueLink
      },
      attempts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching results' });
  }
});

// GET /api/admin/analytics?testIds=id1,id2,id3
router.get('/analytics', protect, admin, async (req, res) => {
  try {
    let { testIds } = req.query;
    let testIdArray = [];

    if (testIds) {
      testIdArray = Array.isArray(testIds)
        ? testIds
        : testIds.split(',').map(id => id.trim()).filter(Boolean);
    }

    if (testIdArray.length === 0) {
      const allTests = await Test.find({}, '_id title createdAt').sort({ createdAt: -1 });
      return res.json({ tests: allTests, analytics: null });
    }

    const tests = await Test.find({ _id: { $in: testIdArray } }).populate('questions');
    const attempts = await Attempt.find({ test: { $in: testIdArray }, completed: true })
      .sort({ endTime: 1 });

    // ── Overall summary ──
    const totalAttempts = attempts.length;
    const uniqueStudents = [...new Set(attempts.map(a => a.studentEmail))].length;
    const passCount = attempts.filter(a =>
      a.totalQuestions > 0 && (a.score / a.totalQuestions) >= 0.6
    ).length;
    const failCount = totalAttempts - passCount;
    const avgScore = totalAttempts > 0
      ? parseFloat((attempts.reduce((s, a) =>
          s + (a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0), 0
        ) / totalAttempts).toFixed(1))
      : 0;
    const avgTime = totalAttempts > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.timeTaken || 0), 0) / totalAttempts)
      : 0;

    // ── Score distribution (10 buckets 0–100%) ──
    const buckets = Array(10).fill(0);
    attempts.forEach(a => {
      if (a.totalQuestions > 0) {
        const pct = (a.score / a.totalQuestions) * 100;
        const idx = Math.min(Math.floor(pct / 10), 9);
        buckets[idx]++;
      }
    });
    const scoreDistribution = buckets.map((count, i) => ({
      range: `${i * 10}-${i * 10 + 10}`,
      count
    }));

    // ── Performance over time (daily avg score) ──
    const timeMap = {};
    attempts.forEach(a => {
      if (!a.endTime) return;
      const dateKey = new Date(a.endTime).toISOString().split('T')[0];
      if (!timeMap[dateKey]) timeMap[dateKey] = { date: dateKey, count: 0, totalPct: 0, passCount: 0 };
      timeMap[dateKey].count++;
      timeMap[dateKey].totalPct += a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0;
      if (a.totalQuestions > 0 && (a.score / a.totalQuestions) >= 0.6) timeMap[dateKey].passCount++;
    });
    const performanceOverTime = Object.values(timeMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        avgScore: d.count > 0 ? parseFloat((d.totalPct / d.count).toFixed(1)) : 0,
        attempts: d.count,
        passCount: d.passCount
      }));

    // ── Per-test breakdown ──
    const perTest = tests.map(test => {
      const testAttempts = attempts.filter(a => a.test.toString() === test._id.toString());
      const tCount = testAttempts.length;
      const tPass = testAttempts.filter(a =>
        a.totalQuestions > 0 && (a.score / a.totalQuestions) >= 0.6
      ).length;
      const tAvg = tCount > 0
        ? parseFloat((testAttempts.reduce((s, a) =>
            s + (a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0), 0
          ) / tCount).toFixed(1))
        : 0;

      // Per-question stats
      const questions = (test.questions || []).map(q => {
        let correct = 0, total = 0, timeSum = 0;
        testAttempts.forEach(attempt => {
          const ans = (attempt.answers || []).find(
            a => a.questionId?.toString() === q._id.toString()
          );
          if (ans) {
            total++;
            if (ans.isCorrect) correct++;
            timeSum += ans.timeSpent || 0;
          }
        });
        return {
          _id: q._id,
          text: q.text,
          difficulty: q.difficulty || 'medium',
          category: q.category || 'General',
          correctCount: correct,
          wrongCount: total - correct,
          totalAttempts: total,
          correctPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
          avgTime: total > 0 ? Math.round(timeSum / total) : 0
        };
      });

      // Difficulty heatmap: 3 rows (easy/medium/hard) x 5 cols (0-20,21-40,41-60,61-80,81-100)
      const heatmapDifficulties = ['easy', 'medium', 'hard'];
      const heatmapGrid = heatmapDifficulties.map(diff => {
        const diffQs = questions.filter(q => q.difficulty === diff);
        const row = [0, 0, 0, 0, 0];
        diffQs.forEach(q => {
          const idx = Math.min(Math.floor(q.correctPercent / 20), 4);
          row[idx]++;
        });
        return { difficulty: diff, buckets: row };
      });

      return {
        testId: test._id,
        testTitle: test.title,
        totalAttempts: tCount,
        passCount: tPass,
        failCount: tCount - tPass,
        avgScore: tAvg,
        questions,
        heatmapGrid
      };
    });

    // ── Top performers ──
    const studentMap = {};
    attempts.forEach(a => {
      const key = a.studentEmail;
      if (!studentMap[key]) {
        studentMap[key] = { studentName: a.studentName, studentEmail: a.studentEmail, testsTaken: 0, totalPct: 0, bestScore: 0 };
      }
      studentMap[key].testsTaken++;
      const pct = a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0;
      studentMap[key].totalPct += pct;
      if (pct > studentMap[key].bestScore) studentMap[key].bestScore = pct;
    });
    const topStudents = Object.values(studentMap)
      .map(s => ({ ...s, avgScore: parseFloat((s.totalPct / s.testsTaken).toFixed(1)) }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    res.json({
      summary: { totalAttempts, uniqueStudents, passCount, failCount, avgScore, avgTime },
      scoreDistribution,
      performanceOverTime,
      perTest,
      topStudents
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Error generating analytics' });
  }
});

// GET /api/admin/tests/:testId/export
router.get('/tests/:testId/export', protect, admin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const attempts = await Attempt.find({ test: req.params.testId, completed: true })
      .sort({ score: -1, timeTaken: 1 });

    const summaryData = attempts.map((a, idx) => ({
      'Rank': idx + 1,
      'Student Name': a.studentName,
      'Email': a.studentEmail,
      'Score': a.score,
      'Total Questions': a.totalQuestions,
      'Percentage': Math.round((a.score / a.totalQuestions) * 100) + '%',
      'Time Taken (sec)': a.timeTaken || 0,
      'Tab Switches': a.tabSwitchCount || 0,
      'Submitted At': a.endTime ? new Date(a.endTime).toLocaleString() : '—'
    }));

    const questionMap = {};
    test.questions.forEach(q => { questionMap[q._id.toString()] = q; });

    const detailData = [];
    attempts.forEach(a => {
      a.answers.forEach((ans, i) => {
        const q = questionMap[ans.questionId?.toString()];
        detailData.push({
          'Student Name': a.studentName,
          'Email': a.studentEmail,
          'Q#': i + 1,
          'Question': q ? q.text : 'Unknown',
          'Student Answer': ans.selectedOption || '(skipped)',
          'Correct Answer': q ? q.correctAnswer : '—',
          'Result': ans.isCorrect ? 'Correct' : 'Wrong',
          'Time Spent (sec)': ans.timeSpent || 0
        });
      });
    });

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(summaryData), 'Summary');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(detailData), 'Per-Question Detail');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${test.title.replace(/[^a-zA-Z0-9]/g, '_')}_results.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error exporting results' });
  }
});

// GET /api/admin/sample-template
router.get('/sample-template', protect, admin, async (req, res) => {
  try {
    const sampleData = [
      { question: 'What is the capital of France?', type: 'MCQ', options: 'Paris | London | Berlin | Madrid', rect_answ: 'Paris', difficulty: 'easy', category: 'Geography' },
      { question: 'Linux is an open-source operating system.', type: 'True/False', options: 'True | False', rect_answ: 'True', difficulty: 'easy', category: 'Linux' },
      { question: 'Which command lists files in Linux?', type: 'MCQ', options: 'ls | cd | rm | mv', rect_answ: 'ls', difficulty: 'medium', category: 'Linux' },
    ];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 50 }, { wch: 12 }, { wch: 60 }, { wch: 25 }, { wch: 12 }, { wch: 15 }];
    xlsx.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="question_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating template' });
  }
});

module.exports = router;
