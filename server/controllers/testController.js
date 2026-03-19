// ==============================
// testController.js
// ==============================

const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');

// ==================== ADMIN CONTROLLERS ==================== //

// Upload questions via Excel AND optionally link them to a test
// POST /api/tests/upload-questions
// Body (form-data): file, testId (optional)
const uploadQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const xlsx = require('xlsx');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or unreadable' });
    }

    const questionsToInsert = rows.map((row, index) => {
      const text = row['question'] || row['Question'];
      const correctAnswer = row['rect_answ'] || row['correctAnswer'] || row['answer'];
      const optionsRaw = row['options'] || row['Options'] || '';
      const options = typeof optionsRaw === 'string'
        ? optionsRaw.split('|').map(o => o.trim()).filter(Boolean)
        : [];

      if (!text || !correctAnswer) {
        throw new Error(`Row ${index + 2}: Missing "question" or "rect_answ"`);
      }

      // ✅ FIX: Excel may return numbers instead of strings — convert before calling .trim()
      return {
        text: String(text).trim(),
        type: row['type'] || 'MCQ',
        options,
        correctAnswer: String(correctAnswer).trim(),
        difficulty: row['difficulty'] || 'medium',
        category: row['category'] || 'General'
      };
    });

    const questions = await Question.insertMany(questionsToInsert);
    const questionIds = questions.map(q => q._id);

    // ✅ KEY FIX: If testId is provided in form body, link questions to that test immediately
    const { testId } = req.body;
    if (testId) {
      const test = await Test.findById(testId);
      if (!test) {
        return res.status(404).json({
          message: 'Questions saved but test not found — link manually using /api/tests/:id/add-questions',
          questionIds
        });
      }
      const existingIds = test.questions.map(id => id.toString());
      const newIds = questionIds.filter(id => !existingIds.includes(id.toString()));
      test.questions.push(...newIds);
      await test.save();

      return res.status(201).json({
        message: `${questions.length} questions uploaded and linked to "${test.title}"`,
        count: questions.length,
        testId: test._id
      });
    }

    res.status(201).json({
      message: `${questions.length} questions saved. Pass testId in the form body to auto-link them.`,
      count: questions.length,
      questionIds
    });
  } catch (error) {
    console.error('Upload Questions Error:', error);
    res.status(500).json({ message: error.message || 'Error uploading questions' });
  }
};

// Create questions manually
// POST /api/tests/create-questions
// Body: { questions: [...], testId: "..." (optional) }
const createQuestions = async (req, res) => {
  try {
    const { questions, testId } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'A non-empty questions array is required' });
    }

    const createdQuestions = await Question.insertMany(questions);
    const questionIds = createdQuestions.map(q => q._id);

    if (testId) {
      const test = await Test.findById(testId);
      if (!test) {
        return res.status(404).json({
          message: 'Questions saved but test not found',
          questionIds
        });
      }
      const existingIds = test.questions.map(id => id.toString());
      const newIds = questionIds.filter(id => !existingIds.includes(id.toString()));
      test.questions.push(...newIds);
      await test.save();

      return res.status(201).json({
        message: `${createdQuestions.length} questions created and linked to test`,
        count: createdQuestions.length,
        questions: createdQuestions
      });
    }

    res.status(201).json({
      message: 'Questions created successfully',
      count: createdQuestions.length,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Create Questions Error:', error);
    res.status(500).json({ message: 'Error creating questions' });
  }
};

// Link existing questions to a test by IDs
// POST /api/tests/:id/add-questions
// Body: { questionIds: ["id1", "id2", ...] }
const addQuestionsToTest = async (req, res) => {
  try {
    const { questionIds } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: 'A non-empty questionIds array is required' });
    }

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const existing = await Question.find({ _id: { $in: questionIds } });
    if (existing.length !== questionIds.length) {
      return res.status(400).json({ message: 'One or more question IDs not found' });
    }

    const existingIds = test.questions.map(id => id.toString());
    const newIds = questionIds.filter(id => !existingIds.includes(id.toString()));
    test.questions.push(...newIds);
    await test.save();

    res.json({
      message: `${newIds.length} questions linked to test`,
      totalQuestions: test.questions.length
    });
  } catch (error) {
    console.error('Add Questions To Test Error:', error);
    res.status(500).json({ message: 'Error linking questions to test' });
  }
};

// Create a new Test
// POST /api/tests
const createTest = async (req, res) => {
  try {
    const {
      title, duration, shuffleQuestions, shuffleOptions,
      questions, accessCode, expiryDate, allowMultipleAttempts, showResults
    } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ message: 'Title and duration are required' });
    }

    const test = await Test.create({
      title: title.trim(),
      duration,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      questions: questions || [],
      accessCode: accessCode || null,
      expiryDate: expiryDate || null,
      allowMultipleAttempts: allowMultipleAttempts || false,
      showResults: showResults !== undefined ? showResults : true,
      isActive: true
    });

    res.status(201).json(test);
  } catch (error) {
    console.error('Create Test Error:', error);
    res.status(500).json({ message: 'Error creating test' });
  }
};

// Get all Tests (admin) — includes questionCount, attemptCount, avgScore per test
// GET /api/tests
const getTests = async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });

    // Fetch attempt stats for all tests in one query
    const testIds = tests.map(t => t._id);
    const attempts = await Attempt.find({ test: { $in: testIds }, completed: true });

    // Group attempts by testId
    const attemptMap = {};
    attempts.forEach(a => {
      const key = a.test.toString();
      if (!attemptMap[key]) attemptMap[key] = [];
      attemptMap[key].push(a);
    });

    const testsWithStats = tests.map(t => {
      const testAttempts = attemptMap[t._id.toString()] || [];
      const attemptCount = testAttempts.length;
      const avgScore = attemptCount > 0
        ? parseFloat(
            (testAttempts.reduce((sum, a) => {
              return sum + (a.totalQuestions > 0 ? (a.score / a.totalQuestions) * 100 : 0);
            }, 0) / attemptCount).toFixed(1)
          )
        : 0;

      return {
        ...t.toObject(),
        questionCount:  t.questions ? t.questions.length : 0,
        totalQuestions: t.questions ? t.questions.length : 0,
        attemptCount,
        avgScore
      };
    });

    res.json(testsWithStats);
  } catch (error) {
    console.error('Get Tests Error:', error);
    res.status(500).json({ message: 'Error fetching tests' });
  }
};

// Get a single test by ID with full questions (admin)
// GET /api/tests/:id
const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (error) {
    console.error('Get Test Error:', error);
    res.status(500).json({ message: 'Error fetching test' });
  }
};

// Get all questions from Question collection (admin)
// GET /api/tests/questions/all
const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    console.error('Get All Questions Error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

// Toggle test active/inactive
// PUT /api/tests/:id/toggle
const toggleTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.isActive = !test.isActive;
    await test.save();

    res.json({ message: `Test is now ${test.isActive ? 'active' : 'inactive'}`, isActive: test.isActive });
  } catch (error) {
    console.error('Toggle Test Error:', error);
    res.status(500).json({ message: 'Error toggling test' });
  }
};

// Update access code for a test (or remove it by sending empty string)
// PUT /api/tests/:id/access-code
const updateAccessCode = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const { accessCode } = req.body;

    // If empty string or not provided — remove the access code entirely
    test.accessCode = (accessCode && accessCode.trim() !== '')
      ? accessCode.trim()
      : undefined;

    await test.save();

    res.json({
      message: test.accessCode
        ? 'Access code updated successfully'
        : 'Access code removed successfully',
      accessCode: test.accessCode || null
    });
  } catch (error) {
    console.error('Update Access Code Error:', error);
    res.status(500).json({ message: 'Error updating access code' });
  }
};

// Delete a test
// DELETE /api/tests/:id
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Delete Test Error:', error);
    res.status(500).json({ message: 'Error deleting test' });
  }
};

// Delete a single question + unlink from all tests
// DELETE /api/tests/questions/:id
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    await Test.updateMany(
      { questions: req.params.id },
      { $pull: { questions: req.params.id } }
    );

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

// Delete ALL questions + clear from all tests
// DELETE /api/tests/questions/all
const deleteAllQuestions = async (req, res) => {
  try {
    await Question.deleteMany({});
    await Test.updateMany({}, { $set: { questions: [] } });
    res.json({ message: 'All questions deleted successfully' });
  } catch (error) {
    console.error('Delete All Questions Error:', error);
    res.status(500).json({ message: 'Error deleting questions' });
  }
};


// ==================== PUBLIC ROUTES ==================== //

// Get test info by shareable link (students)
// GET /api/tests/link/:uniqueLink
const getTestByLink = async (req, res) => {
  try {
    const test = await Test.findOne({ uniqueLink: req.params.uniqueLink, isActive: true });
    if (!test) return res.status(404).json({ message: 'Test not found or inactive' });

    res.json({
      _id: test._id,
      title: test.title,
      duration: test.duration,
      requiresAccessCode: !!test.accessCode,
      expiryDate: test.expiryDate,
      allowMultipleAttempts: test.allowMultipleAttempts,
      totalQuestions: test.questions ? test.questions.length : 0
    });
  } catch (error) {
    console.error('Get Test By Link Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get test questions for students (NO correct answers)
// GET /api/tests/:id/questions
const getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions', '-correctAnswer');

    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.isActive) return res.status(400).json({ message: 'Test is not active' });

    // ✅ Filter out stale null refs
    let questions = (test.questions || []).filter(q => q !== null && q !== undefined);

    if (questions.length === 0) {
      return res.status(200).json({
        testId: test._id,
        title: test.title,
        duration: test.duration,
        questions: [],
        warning: 'No questions have been linked to this test yet. Upload questions and include the testId.'
      });
    }

    if (test.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    if (test.shuffleOptions) {
      questions = questions.map(q => {
        const qObj = q.toObject ? q.toObject() : { ...q };
        if (qObj.options && Array.isArray(qObj.options)) {
          qObj.options = [...qObj.options].sort(() => Math.random() - 0.5);
        }
        return qObj;
      });
    }

    res.json({
      testId: test._id,
      title: test.title,
      duration: test.duration,
      questions
    });
  } catch (error) {
    console.error('Get Test Questions Error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

// Start attempt (students)
// POST /api/tests/attempt/start
const startAttempt = async (req, res) => {
  try {
    const { testId, studentName, studentEmail, accessCode } = req.body;

    if (!testId || !studentName || !studentEmail) {
      return res.status(400).json({ message: 'testId, studentName, and studentEmail are required' });
    }

    const normalizedEmail = studentEmail.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@ltts.com')) {
      return res.status(400).json({ message: 'Only LTTS email IDs are allowed to take this test' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.isActive) return res.status(400).json({ message: 'Test is not active' });
    if (test.expiryDate && new Date() > new Date(test.expiryDate)) {
      return res.status(400).json({ message: 'Test has expired' });
    }
    if (test.accessCode && test.accessCode !== accessCode) {
      return res.status(401).json({ message: 'Invalid access code' });
    }

    const existingAttempt = await Attempt.findOne({ studentEmail: normalizedEmail, test: testId });

    if (existingAttempt && existingAttempt.completed && !test.allowMultipleAttempts) {
      return res.status(400).json({ message: 'You have already completed this test.' });
    }

    if (!existingAttempt || (existingAttempt.completed && test.allowMultipleAttempts)) {
      const attempt = await Attempt.create({
        studentName: studentName.trim(),
        studentEmail: normalizedEmail,
        test: testId,
        totalQuestions: test.questions ? test.questions.length : 0,
        startTime: new Date(),
        completed: false
      });
      return res.status(201).json(attempt);
    }

    res.json(existingAttempt);
  } catch (error) {
    console.error('Start Attempt Error:', error);
    res.status(500).json({ message: 'Error starting attempt' });
  }
};

// Submit attempt with grading
// POST /api/tests/attempt/submit
const submitAttempt = async (req, res) => {
  try {
    const { attemptId, answers, tabSwitchCount } = req.body;

    if (!attemptId || !answers) {
      return res.status(400).json({ message: 'attemptId and answers are required' });
    }

    const attempt = await Attempt.findById(attemptId).populate({
      path: 'test',
      populate: { path: 'questions' }
    });

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.completed) return res.status(400).json({ message: 'Attempt already submitted' });

    const questions = (attempt.test && attempt.test.questions) ? attempt.test.questions : [];
    let score = 0;

    const gradedAnswers = answers.map(ans => {
      const question = questions.find(q => q._id.toString() === ans.questionId);
      const isCorrect = question ? question.correctAnswer === ans.selectedOption : false;
      if (isCorrect) score++;
      return { ...ans, isCorrect };
    });

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.completed = true;    // ✅ Stats query depends on this being true
    attempt.endTime = new Date();
    attempt.timeTaken = Math.round((new Date() - new Date(attempt.startTime)) / 1000);
    attempt.tabSwitchCount = tabSwitchCount || 0;
    await attempt.save();

    res.json({
      message: 'Test submitted successfully',
      score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.totalQuestions > 0
        ? Math.round((score / attempt.totalQuestions) * 100)
        : 0
    });
  } catch (error) {
    console.error('Submit Attempt Error:', error);
    res.status(500).json({ message: 'Error submitting attempt' });
  }
};

module.exports = {
  uploadQuestions,
  createQuestions,
  addQuestionsToTest,
  createTest,
  getTests,
  getTest,
  getAllQuestions,
  toggleTest,
  updateAccessCode,
  deleteTest,
  deleteQuestion,
  deleteAllQuestions,
  getTestByLink,
  getTestQuestions,
  startAttempt,
  submitAttempt
};
