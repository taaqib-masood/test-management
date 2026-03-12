// @desc    Start a test attempt (student — no auth)
// @route   POST /api/attempts/start
// @access  Public
const startAttempt = async (req, res) => {
    try {
        const { testId, studentName, studentEmail, accessCode } = req.body;

        if (!studentName || !studentEmail) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // 🔒 Restrict to LTTS emails
        if (!studentEmail.toLowerCase().endsWith('@ltts.com')) {
            return res.status(400).json({
                message: 'Only LTTS email IDs are allowed to take this test'
            });
        }

        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        if (!test.isActive) {
            return res.status(400).json({ message: 'This test is no longer active' });
        }

        // Check expiry date
        if (test.expiryDate && new Date() > new Date(test.expiryDate)) {
            return res.status(400).json({
                message: 'This test has expired and is no longer accepting responses'
            });
        }

        // Check access code if applicable
        if (test.accessCode && test.accessCode !== accessCode) {
            return res.status(401).json({ message: 'Invalid access code' });
        }

        const normalizedEmail = studentEmail.toLowerCase().trim();

        // Check if this student already attempted
        const existingAttempt = await Attempt.findOne({
            studentEmail: normalizedEmail,
            test: testId
        });

        if (existingAttempt) {
            if (existingAttempt.completed) {
                if (!test.allowMultipleAttempts) {
                    return res.status(400).json({
                        message: 'You have already completed this test. Only one attempt is allowed per email.'
                    });
                }

                const newAttempt = await Attempt.create({
                    studentName: studentName.trim(),
                    studentEmail: normalizedEmail,
                    test: testId,
                    totalQuestions: test.totalQuestions,
                    startTime: Date.now()
                });

                return res.status(201).json(newAttempt);
            }

            return res.json(existingAttempt);
        }

        const newAttempt = await Attempt.create({
            studentName: studentName.trim(),
            studentEmail: normalizedEmail,
            test: testId,
            totalQuestions: test.totalQuestions,
            startTime: Date.now()
        });

        res.status(201).json(newAttempt);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error starting attempt' });
    }
};
