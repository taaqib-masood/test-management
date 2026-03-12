const Test = require('../models/Test');
const Question = require('../models/Question'); // make sure you have a Question model
const Attempt = require('../models/Attempt');

// ---------------------
// Admin Functions
// ---------------------

// Upload questions via Excel/CSV (requires parsing logic)
const uploadQuestions = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Parse Excel/CSV file here and insert into DB
    // For example, using 'xlsx' package
    const xlsx = require('xlsx');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const questions = await Question.insertMany(data);

    res.status(201).json({ message: 'Questions uploaded successfully', count: questions.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error uploading questions' });
  }
};

// Create questions manually
const createQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const createdQuestions = await Question.insertMany(questions);

    res.status(201).json({ message: 'Questions created', questions: createdQuestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating questions' });
  }
};

// Create a test
const createTest = async (req, res) => {
  try {
    const { title, duration, questions, shuffleQuestions, shuffleOptions } = req.body;

    const test = await Test.create({
      title,
      duration,
      questions,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      isActive: true,
    });

    res.status(201).json({ message: 'Test created', test });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating test' });
  }
};

// Get a single test (admin)
const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching test' });
  }
};

// Get all tests (admin)
const getTests = async (req, res) => {
  try {
    const tests = await Test.find().populate('questions');
    res.json(tests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching tests' });
  }
};

// Get all questions (admin)
const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

// Toggle test active/inactive
const toggleTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.isActive = !test.isActive;
    await test.save();

    res.json({ message: `Test is now ${test.isActive ? 'active' : 'inactive'}`, test });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error toggling test' });
  }
};

// Delete test
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    res.json({ message: 'Test deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting test' });
  }
};

// Delete single question
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

// Delete all questions
const deleteAllQuestions = async (req, res) => {
  try {
    await Question.deleteMany();
    res.json({ message: 'All questions deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting questions' });
  }
};

// ---------------------
// Public Routes
// ---------------------

const getTestByLink = async (req, res) => {
  try {
    const test = await Test.findOne({ uniqueLink: req.params.uniqueLink, isActive: true }).populate('questions');
    if (!test) return res.status(404).json({ message: 'Test not found or inactive' });
    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions', '-correctAnswer');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    let questions = (test.questions || []).filter(q => q !== null);

    if (test.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    if (test.shuffleOptions) {
      questions = questions.map(q => {
        const qObj = q.toObject();
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
      questions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

module.exports = {
  uploadQuestions,
  createQuestions,
  createTest,
  getTest,
  getTests,
  getTestByLink,
  getTestQuestions,
  getAllQuestions,
  toggleTest,
  deleteTest,
  deleteQuestion,
  deleteAllQuestions,
};
