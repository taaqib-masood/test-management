const Test = require('../models/Test');
const Attempt = require('../models/Attempt');


// ============================
// ADMIN PLACEHOLDER FUNCTIONS
// ============================

const uploadQuestions = async (req,res)=>{res.json({message:"uploadQuestions not implemented yet"})}
const createQuestions = async (req,res)=>{res.json({message:"createQuestions not implemented yet"})}
const createTest = async (req,res)=>{res.json({message:"createTest not implemented yet"})}
const getTest = async (req,res)=>{res.json({message:"getTest not implemented yet"})}
const getTests = async (req,res)=>{res.json({message:"getTests not implemented yet"})}
const getAllQuestions = async (req,res)=>{res.json({message:"getAllQuestions not implemented yet"})}
const toggleTest = async (req,res)=>{res.json({message:"toggleTest not implemented yet"})}
const deleteTest = async (req,res)=>{res.json({message:"deleteTest not implemented yet"})}
const deleteQuestion = async (req,res)=>{res.json({message:"deleteQuestion not implemented yet"})}
const deleteAllQuestions = async (req,res)=>{res.json({message:"deleteAllQuestions not implemented yet"})}


// ============================
// PUBLIC FUNCTIONS
// ============================

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



// ============================
// EXPORTS
// ============================

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
