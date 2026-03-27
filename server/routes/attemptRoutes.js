// server/routes/attemptRoutes.js

const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const { snapshotUpload } = attemptController;

// IMPORTANT: specific static-segment routes must come BEFORE /:id
// otherwise Express matches /user/xxx and /test/xxx as /:id

router.get('/user/:userId',   attemptController.getUserAttempts);
router.get('/test/:testId',   attemptController.getTestAttempts);

// Student entry endpoint — finds/creates user then creates attempt
router.post('/start',         attemptController.startAttempt);

router.post('/',              attemptController.createAttempt);
router.get('/:id',            attemptController.getAttempt);
router.put('/:id/submit',     attemptController.submitAttempt);
router.post('/:id/submit',    attemptController.submitAttempt);   // frontend uses POST
router.put('/:id/save',       attemptController.saveProgress);

router.post('/:attemptId/violation',                    attemptController.logViolation);
router.post('/:attemptId/snapshot', snapshotUpload.single('snapshot'), attemptController.uploadSnapshot);
router.put('/:attemptId/answer/:questionId',            attemptController.updateAnswer);
router.post('/:attemptId/feedback',                     attemptController.submitQuestionFeedback);
router.get('/:attemptId/progress',                      attemptController.getAttemptProgress);

module.exports = router;
