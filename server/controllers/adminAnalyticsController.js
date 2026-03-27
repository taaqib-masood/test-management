// server/controllers/adminAnalyticsController.js - COMPLETE FILE (NEW - PHASE 4)

const Attempt = require('../models/Attempt');
const Test = require('../models/Test');

// Get proctoring overview for a test
exports.getProctoringOverview = async (req, res) => {
  try {
    const { testId } = req.params;
    
    const attempts = await Attempt.find({ testId })
      .populate('userId', 'name email')
      .select('userId suspicionScore violations proctoring autoSubmitted createdAt')
      .sort({ suspicionScore: -1 });
    
    const stats = {
      totalAttempts: attempts.length,
      highRiskCount: attempts.filter(a => a.suspicionScore >= 80).length,
      mediumRiskCount: attempts.filter(a => a.suspicionScore >= 50 && a.suspicionScore < 80).length,
      lowRiskCount: attempts.filter(a => a.suspicionScore < 50).length,
      autoSubmittedCount: attempts.filter(a => a.autoSubmitted).length,
      
      violationStats: {
        tabSwitches: 0,
        noFace: 0,
        multipleFaces: 0,
        devTools: 0,
        copyPaste: 0
      }
    };
    
    // Count violation types
    attempts.forEach(attempt => {
      attempt.violations.forEach(v => {
        if (v.type === 'TAB_SWITCH' || v.type === 'FULLSCREEN_EXIT') {
          stats.violationStats.tabSwitches++;
        } else if (v.type === 'NO_FACE') {
          stats.violationStats.noFace++;
        } else if (v.type === 'MULTIPLE_FACES') {
          stats.violationStats.multipleFaces++;
        } else if (v.type === 'DEVTOOLS_OPEN') {
          stats.violationStats.devTools++;
        } else if (v.type === 'COPY_PASTE') {
          stats.violationStats.copyPaste++;
        }
      });
    });
    
    res.json({
      success: true,
      stats,
      attempts: attempts.map(a => ({
        id: a._id,
        student: a.userId,
        suspicionScore: a.suspicionScore,
        riskLevel: a.suspicionScore >= 80 ? 'HIGH' : 
                   a.suspicionScore >= 50 ? 'MEDIUM' : 'LOW',
        violationCount: a.violations.length,
        snapshotCount: a.proctoring.snapshotsUrls.length,
        autoSubmitted: a.autoSubmitted,
        completedAt: a.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error getting proctoring overview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get detailed proctoring data for single attempt
exports.getAttemptProctoringDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    const attempt = await Attempt.findById(attemptId)
      .populate('userId', 'name email')
      .populate('testId', 'title duration');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    
    // Create timeline
    const timeline = [];
    
    // Add start event
    timeline.push({
      timestamp: attempt.createdAt,
      type: 'TEST_START',
      description: 'Test started',
      severity: 'INFO'
    });
    
    // Add violations
    attempt.violations.forEach(v => {
      timeline.push({
        timestamp: v.timestamp,
        type: v.type,
        description: getViolationDescription(v.type),
        severity: v.severity,
        details: v.details
      });
    });
    
    // Add face detection logs
    attempt.proctoring.faceDetectionLogs.forEach(log => {
      if (log.status !== 'OK') {
        timeline.push({
          timestamp: log.timestamp,
          type: 'FACE_DETECTION',
          description: `${log.status} - ${log.facesDetected} face(s) detected`,
          severity: 'MEDIUM'
        });
      }
    });
    
    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
      success: true,
      data: {
        student: attempt.userId,
        test: attempt.testId,
        suspicionScore: attempt.suspicionScore,
        riskLevel: attempt.suspicionScore >= 80 ? 'HIGH' : 
                   attempt.suspicionScore >= 50 ? 'MEDIUM' : 'LOW',
        autoSubmitted: attempt.autoSubmitted,
        autoSubmitReason: attempt.autoSubmitReason,
        timeline,
        snapshots: attempt.proctoring.snapshotsUrls,
        statistics: {
          totalViolations: attempt.violations.length,
          faceIssues: attempt.violations.filter(v => 
            v.type === 'NO_FACE' || v.type === 'MULTIPLE_FACES'
          ).length,
          tabSwitches: attempt.violations.filter(v => 
            v.type === 'TAB_SWITCH' || v.type === 'FULLSCREEN_EXIT'
          ).length,
          otherViolations: attempt.violations.filter(v => 
            !['NO_FACE', 'MULTIPLE_FACES', 'TAB_SWITCH', 'FULLSCREEN_EXIT'].includes(v.type)
          ).length
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting attempt details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get flagged questions report
exports.getFlaggedQuestionsReport = async (req, res) => {
  try {
    const { testId } = req.params;
    
    const attempts = await Attempt.find({ testId })
      .populate('questionFeedback.questionId');
    
    // Aggregate feedback by question
    const feedbackMap = new Map();
    
    attempts.forEach(attempt => {
      attempt.questionFeedback.forEach(feedback => {
        const qId = feedback.questionId._id.toString();
        
        if (!feedbackMap.has(qId)) {
          feedbackMap.set(qId, {
            question: feedback.questionId,
            feedbackCount: 0,
            issues: {}
          });
        }
        
        const data = feedbackMap.get(qId);
        data.feedbackCount++;
        
        if (!data.issues[feedback.issue]) {
          data.issues[feedback.issue] = 0;
        }
        data.issues[feedback.issue]++;
      });
    });
    
    const report = Array.from(feedbackMap.values())
      .sort((a, b) => b.feedbackCount - a.feedbackCount);
    
    res.json({
      success: true,
      report
    });
    
  } catch (error) {
    console.error('Error getting flagged questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function
function getViolationDescription(type) {
  const descriptions = {
    'TAB_SWITCH': 'Tab/window switched',
    'FULLSCREEN_EXIT': 'Exited fullscreen mode',
    'NO_FACE': 'No face detected',
    'MULTIPLE_FACES': 'Multiple faces detected',
    'DEVTOOLS_OPEN': 'Developer tools opened',
    'COPY_PASTE': 'Attempted copy/paste',
    'BLUR': 'Window focus lost',
    'IDLE': 'Idle for extended period'
  };
  
  return descriptions[type] || 'Violation detected';
}

module.exports = {
  getProctoringOverview,
  getAttemptProctoringDetails,
  getFlaggedQuestionsReport
};
