const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const { parseExcelRequest } = require('../utils/excelParser');

// ==============================
// ADMIN CONTROLLERS
// ==============================

const uploadQuestions = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const parsed = parseExcelRequest(req.file.buffer);
    if (!parsed || parsed.length === 0) {
      return res.status(400).json({ message: 'No valid questions found in file' });
    }

    // Save questions to DB immediately
    const withCreator = parsed.map(q => ({ ...q, createdBy: req.user?._id || null }));
    const saved = await Question.insertMany(withCreator);

    // If testId provided, link questions to that test
    if (req.body.testId) {
      const test = await Test.findById(req.body.testId);
      if (test) {
        const newIds = saved.map(q => q._id.toString());
        test.questions = [...new Set([...test.questions.map(String), ...newIds])];
        test.totalQuestions = test.questions.length;
        await test.save();
      }
    }

    res.status(200).json({
      message: `${saved.length} questions uploaded successfully!`,
      count: saved.length,
      questionIds: saved.map(q => q._id)
    });
  } catch (error) {
    console.error('Upload Questions Error:', error);
    res.status(500).json({ message: 'Error parsing or saving file' });
  }
};

const createQuestions = async (req, res) => {
  try {
    const questions = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }
    const withCreator = questions.map(q => ({ ...q, createdBy: req.user._id }));
    const saved = await Question.insertMany(withCreator);
    res.status(201).json({ message: `${saved.length} questions saved`, questions: saved });
  } catch (error) {
    console.error('Create Questions Error:', error);
    res.status(500).json({ message: 'Error saving questions' });
  }
};

const createTest = async (req, res) => {
  try {
    console.log('CREATE TEST HIT - body:', JSON.stringify(req.body));
    console.log('CREATE TEST USER:', req.user);

    const {
      title, duration, questions, shuffleQuestions, shuffleOptions,
      showResults, allowMultipleAttempts, accessCode, expiryDate,
      totalQuestions, tabSwitchLimit
    } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ message: 'Title and duration are required' });
    }

    if (!req.user || !req.user._id) {
      console.error('CREATE TEST - req.user missing or has no _id:', req.user);
      return res.status(401).json({ message: 'Authentication error: user not found' });
    }

    const test = await Test.create({
      title,
      duration,
      questions: questions || [],
      totalQuestions: totalQuestions || (questions ? questions.length : 0),
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      showResults: showResults || false,
      allowMultipleAttempts: allowMultipleAttempts !== false,
      accessCode: accessCode || '',
      expiryDate: expiryDate || null,
      tabSwitchLimit: tabSwitchLimit !== undefined ? tabSwitchLimit : 3,
      isActive: true,
      createdBy: req.user._id
    });

    console.log('CREATE TEST SUCCESS - id:', test._id, 'link:', test.uniqueLink);
    res.status(201).json(test);
  } catch (error) {
    console.error('Create Test Error:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Error creating test' });
  }
};

const getTests = async (req, res) => {
  try {
    // No createdBy filter — return all tests regardless of who created them
    const tests = await Test.find().sort({ createdAt: -1 });

    const testsWithStats = await Promise.all(tests.map(async (test) => {
      // Patch old tests that were created before uniqueLink was added to schema
      if (!test.uniqueLink) {
        test.uniqueLink = Math.random().toString(36).substring(2, 10) +
                          Math.random().toString(36).substring(2, 6);
        await test.save();
      }

      const attempts = await Attempt.find({ testId: test._id, status: 'completed' });
      const attemptCount = attempts.length;
      const avgScore = attemptCount > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attemptCount)
        : 0;
      return { ...test.toObject(), attemptCount, avgScore };
    }));

    res.json(testsWithStats);
  } catch (error) {
    console.error('Get Tests Error:', error);
    res.status(500).json({ message: 'Error fetching tests' });
  }
};

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

const getAllQuestions = async (req, res) => {
  try {
    // No createdBy filter — return all questions
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    console.error('Get All Questions Error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

const toggleTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.isActive = !test.isActive;
    await test.save();
    res.json({ isActive: test.isActive });
  } catch (error) {
    console.error('Toggle Test Error:', error);
    res.status(500).json({ message: 'Error toggling test' });
  }
};

const updateAccessCode = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    const { accessCode } = req.body;
    test.accessCode = accessCode && String(accessCode).trim() !== '' ? String(accessCode).trim() : '';
    await test.save();
    res.json({
      message: test.accessCode ? 'Access code updated' : 'Access code removed',
      accessCode: test.accessCode || null
    });
  } catch (error) {
    console.error('Update Access Code Error:', error);
    res.status(500).json({ message: 'Error updating access code' });
  }
};

const addQuestionsToTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ message: 'questionIds array is required' });
    }
    test.questions = [...new Set([...test.questions.map(String), ...questionIds])];
    test.totalQuestions = test.questions.length;
    await test.save();
    res.json({ message: 'Questions added', totalQuestions: test.totalQuestions });
  } catch (error) {
    console.error('Add Questions Error:', error);
    res.status(500).json({ message: 'Error adding questions' });
  }
};

const deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    await Attempt.deleteMany({ testId: req.params.id });
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Delete Test Error:', error);
    res.status(500).json({ message: 'Error deleting test' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

const deleteAllQuestions = async (req, res) => {
  try {
    const result = await Question.deleteMany({});
    res.json({ message: `${result.deletedCount} questions deleted` });
  } catch (error) {
    console.error('Delete All Questions Error:', error);
    res.status(500).json({ message: 'Error deleting questions' });
  }
};

// ==============================
// PUBLIC ROUTES
// ==============================

const getTestByLink = async (req, res) => {
  try {
    const test = await Test.findOne({ uniqueLink: req.params.uniqueLink, isActive: true });
    if (!test) return res.status(404).json({ message: 'Test not found or inactive' });
    if (test.expiryDate && new Date() > new Date(test.expiryDate)) {
      return res.status(400).json({ message: 'This test has expired' });
    }
    res.json({
      _id: test._id,
      title: test.title,
      duration: test.duration,
      totalQuestions: test.totalQuestions,
      requiresAccessCode: !!(test.accessCode && test.accessCode.trim()),
      hasAccessCode: !!(test.accessCode && test.accessCode.trim()),
      allowMultipleAttempts: test.allowMultipleAttempts,
      expiryDate: test.expiryDate,
      tabSwitchLimit: test.tabSwitchLimit !== undefined ? test.tabSwitchLimit : 3
    });
  } catch (error) {
    console.error('Get Test By Link Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    let questions = (test.questions || []).filter(q => q !== null);

    if (test.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    questions = questions.map(q => {
      const qObj = q.toObject ? q.toObject() : { ...q };
      if (test.shuffleOptions && qObj.options && Array.isArray(qObj.options)) {
        qObj.options = [...qObj.options].sort(() => Math.random() - 0.5);
      }
      delete qObj.correctAnswer;
      return qObj;
    });

    res.json({
      testId:        test._id,
      title:         test.title,
      duration:      test.duration,
      tabSwitchLimit: test.tabSwitchLimit !== undefined ? test.tabSwitchLimit : 3,
      showResults:   test.showResults !== false,
      antiCheating:  true,
      questions
    });
  } catch (error) {
    console.error('Get Test Questions Error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

module.exports = {
  uploadQuestions,
  createQuestions,
  createTest,
  getTests,
  getTest,
  getAllQuestions,
  toggleTest,
  updateAccessCode,
  addQuestionsToTest,
  deleteTest,
  deleteQuestion,
  deleteAllQuestions,
  getTestByLink,
  getTestQuestions
};
