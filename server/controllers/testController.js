const Test = require('../models/Test');
const Attempt = require('../models/Attempt');


// Placeholder admin functions
const uploadQuestions = async (req,res)=>res.json({message:"Not implemented"});
const createQuestions = async (req,res)=>res.json({message:"Not implemented"});
const createTest = async (req,res)=>res.json({message:"Not implemented"});
const getTest = async (req,res)=>res.json({message:"Not implemented"});
const getTests = async (req,res)=>res.json({message:"Not implemented"});
const getAllQuestions = async (req,res)=>res.json({message:"Not implemented"});
const toggleTest = async (req,res)=>res.json({message:"Not implemented"});
const deleteTest = async (req,res)=>res.json({message:"Not implemented"});
const deleteQuestion = async (req,res)=>res.json({message:"Not implemented"});
const deleteAllQuestions = async (req,res)=>res.json({message:"Not implemented"});


// PUBLIC ROUTES

const getTestByLink = async (req, res) => {
  try {

    const test = await Test.findOne({
      uniqueLink: req.params.uniqueLink,
      isActive: true
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found or inactive' });
    }

    res.json(test);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


const getTestQuestions = async (req, res) => {
  try {

    const test = await Test.findById(req.params.id)
      .populate('questions', '-correctAnswer');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

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
      questions
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};


const startAttempt = async (req, res) => {
  try {

    const { testId, studentName, studentEmail } = req.body;

    const attempt = await Attempt.create({
      test: testId,
      studentName,
      studentEmail,
      startTime: new Date()
    });

    res.status(201).json(attempt);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error starting attempt' });
  }
};


const submitAttempt = async (req, res) => {
  try {

    const { attemptId, answers } = req.body;

    const attempt = await Attempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    attempt.answers = answers;
    attempt.submittedAt = new Date();

    await attempt.save();

    res.json({ message: 'Test submitted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error submitting test' });
  }
};


module.exports = {
  uploadQuestions,
  createQuestions,
  createTest,
  getTest,
  getTests,
  getAllQuestions,
  toggleTest,
  deleteTest,
  deleteQuestion,
  deleteAllQuestions,
  getTestByLink,
  getTestQuestions,
  startAttempt,
  submitAttempt
};
