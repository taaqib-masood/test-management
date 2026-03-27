// server/services/violationService.js - COMPLETE FILE (NEW)

const VIOLATION_SCORES = {
  TAB_SWITCH: 10,
  FULLSCREEN_EXIT: 10,
  COPY_PASTE: 5,
  DEVTOOLS_OPEN: 30,
  NO_FACE: 20,
  MULTIPLE_FACES: 30,
  IDLE: 5,
  BLUR: 8
};

const SEVERITY_THRESHOLDS = {
  LOW: 0,
  MEDIUM: 20,
  HIGH: 50,
  CRITICAL: 80
};

class ViolationService {
  
  calculateScore(violations) {
    return violations.reduce((total, v) => {
      return total + (VIOLATION_SCORES[v.type] || 0);
    }, 0);
  }
  
  getSeverityLevel(score) {
    if (score >= SEVERITY_THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (score >= SEVERITY_THRESHOLDS.HIGH) return 'HIGH';
    if (score >= SEVERITY_THRESHOLDS.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }
  
  shouldAutoSubmit(violations, maxTabSwitches) {
    const tabSwitchCount = violations.filter(v => 
      v.type === 'TAB_SWITCH' || v.type === 'FULLSCREEN_EXIT'
    ).length;
    
    return tabSwitchCount >= maxTabSwitches;
  }
  
  getViolationMessage(count, max) {
    const remaining = max - count;
    
    if (remaining === 0) {
      return 'Maximum violations reached. Test will be auto-submitted.';
    } else if (remaining === 1) {
      return '⚠️ FINAL WARNING: One more violation will auto-submit your test!';
    } else {
      return `⚠️ Warning: Tab switch detected (${count}/${max}). Remaining: ${remaining}`;
    }
  }
  
  getViolationDescription(type) {
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
}

module.exports = new ViolationService();
