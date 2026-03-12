// @desc    Get test questions (for active attempt)
// @route   GET /api/tests/:id/questions
// @access  Public
const getTestQuestions = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id)
            .populate('questions', '-correctAnswer');

        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        // Remove broken question references
        let questions = (test.questions || []).filter(q => q !== null);

        if (questions.length === 0) {
            return res.status(400).json({ message: 'No valid questions found for this test' });
        }

        // Shuffle questions if enabled
        if (test.shuffleQuestions) {
            questions = [...questions].sort(() => Math.random() - 0.5);
        }

        // Shuffle options if enabled
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
