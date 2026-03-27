// server/controllers/proctoringController.js - COMPLETE FILE (NEW - PHASE 3)

const Attempt = require('../models/Attempt');
const fs = require('fs');
const path = require('path');

// Check if Cloudinary is configured
let cloudinary;
try {
  cloudinary = require('../config/cloudinary');
} catch (error) {
  console.log('Cloudinary not available, using local storage');
}

// PHASE 3: Upload snapshot
exports.uploadSnapshot = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { eventType, facesDetected } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    let imageUrl;
    
    // Upload to Cloudinary if configured
    if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'test-proctoring',
          resource_type: 'image'
        });
        imageUrl = result.secure_url;
        
        // Delete local temp file
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed:', cloudinaryError);
        // Fall back to local storage
        imageUrl = `/uploads/proctoring/${req.file.filename}`;
      }
    } else {
      // Use local path
      imageUrl = `/uploads/proctoring/${req.file.filename}`;
    }
    
    // Add to snapshots
    attempt.proctoring.snapshotsUrls.push(imageUrl);
    
    // Add face detection log
    const facesCount = parseInt(facesDetected) || 0;
    attempt.proctoring.faceDetectionLogs.push({
      timestamp: new Date(),
      facesDetected: facesCount,
      status: facesCount === 0 ? 'NO_FACE' : 
              facesCount > 1 ? 'MULTIPLE_FACES' : 'OK'
    });
    
    // Log violation if face issue detected
    if (facesCount === 0) {
      attempt.violations.push({
        type: 'NO_FACE',
        timestamp: new Date(),
        severity: 'HIGH',
        details: 'No face detected in frame'
      });
      attempt.suspicionScore += 20;
    } else if (facesCount > 1) {
      attempt.violations.push({
        type: 'MULTIPLE_FACES',
        timestamp: new Date(),
        severity: 'HIGH',
        details: `${facesCount} faces detected in frame`
      });
      attempt.suspicionScore += 30;
    }
    
    await attempt.save();
    
    res.json({
      success: true,
      imageUrl,
      suspicionScore: attempt.suspicionScore
    });
    
  } catch (error) {
    console.error('Error uploading snapshot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PHASE 3: Store reference image (at test start)
exports.storeReferenceImage = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    let imageUrl;
    
    // Upload to Cloudinary if configured
    if (cloudinary && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'test-proctoring/reference',
          resource_type: 'image'
        });
        imageUrl = result.secure_url;
        
        // Delete local temp file
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed:', cloudinaryError);
        // Fall back to local storage
        imageUrl = `/uploads/proctoring/${req.file.filename}`;
      }
    } else {
      // Use local path
      imageUrl = `/uploads/proctoring/${req.file.filename}`;
    }
    
    attempt.proctoring.referenceImageUrl = imageUrl;
    attempt.proctoring.webcamEnabled = true;
    attempt.proctoring.monitoringStarted = new Date();
    
    await attempt.save();
    
    res.json({
      success: true,
      referenceImageUrl: imageUrl
    });
    
  } catch (error) {
    console.error('Error storing reference image:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PHASE 3: Get proctoring data for admin
exports.getProctoringData = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    const attempt = await Attempt.findById(attemptId)
      .populate('userId', 'name email')
      .populate('testId', 'title');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    res.json({
      success: true,
      data: {
        student: attempt.userId,
        test: attempt.testId,
        suspicionScore: attempt.suspicionScore,
        violations: attempt.violations,
        proctoring: attempt.proctoring,
        autoSubmitted: attempt.autoSubmitted,
        autoSubmitReason: attempt.autoSubmitReason
      }
    });
    
  } catch (error) {
    console.error('Error getting proctoring data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadSnapshot,
  storeReferenceImage,
  getProctoringData
};
