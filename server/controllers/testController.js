const Test = require('../models/Test');
const Attempt = require('../models/Attempt');


// @desc    Get test by unique link
// @route   GET /api/tests/link/:uniqueLink
// @access  Public
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



// @desc    Get test questions
// @route   GET /api/tests/:id/questions
// @access  Public
const getTestQuestions = async (req, res) => {
    try {

        const test = await Test.findById(req.params.id)
            .populate('questions', '-correctAnswer');

        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        let questions = (test.questions || []).filter(q => q !== null);

        if (questions.length === 0) {
            return res.status(400).json({
                message: 'No valid questions found for this test'
            });
        }

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



// @desc    Start test attempt
// @route   POST /api/attempts/start
// @access  Public
const startAttempt = async (req, res) => {
    try {

        const { testId, studentName, studentEmail } = req.body;

        if (!testId || !studentName || !studentEmail) {
            return res.status(400).json({
                message: 'Missing required fields'
            });
        }

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



// @desc    Submit test attempt
// @route   POST /api/attempts/submit
// @access  Public
const submitAttempt = async (req, res) => {
    try {

        const { attemptId, answers } = req.body;

        const attempt = await Attempt.findById(attemptId);

        if (!attempt) {
            return res.status(404).json({
                message: 'Attempt not found'
            });
        }

        attempt.answers = answers;
        attempt.submittedAt = new Date();

        await attempt.save();

        res.json({
            message: 'Test submitted successfully'
        });

    } catch (error) {

        console.error(error);
        res.status(500).json({
            message: 'Error submitting test'
        });

    }
};



module.exports = {
    getTestByLink,
    getTestQuestions,
    startAttempt,
    submitAttempt
};
