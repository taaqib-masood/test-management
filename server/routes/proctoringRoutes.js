// server/routes/proctoringRoutes.js - COMPLETE FILE (NEW - PHASE 3)

const express = require('express');
const router = express.Router();
const proctoringController = require('../controllers/proctoringController');
const upload = require('../config/localStorage');

// Upload snapshot
router.post(
  '/snapshot/:attemptId',
  upload.single('image'),
  proctoringController.uploadSnapshot
);

// Store reference image
router.post(
  '/reference/:attemptId',
  upload.single('image'),
  proctoringController.storeReferenceImage
);

// Get proctoring data (admin only - add auth middleware if needed)
router.get('/data/:attemptId', proctoringController.getProctoringData);

module.exports = router;
