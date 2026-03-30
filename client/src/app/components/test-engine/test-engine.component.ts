import {
  Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── Violation weight constants ───────────────────────────────────────────────
const VIOLATION_WEIGHTS: Record<string, number> = {
  TAB_SWITCH:      25,
  WINDOW_BLUR:     15,
  NO_FACE:         20,
  MULTIPLE_FACES:  30,
  COPY_ATTEMPT:    40,
  PASTE_ATTEMPT:   40,
  RIGHT_CLICK:     10,
  DEV_TOOLS:       0,   // disabled
  FULLSCREEN_EXIT: 20,
  VOICE_DETECTED:  20,
};

const MAX_SUSPICION_SCORE = 100; // auto-submit threshold

@Component({
  selector: 'app-test-engine',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-engine.component.html',
  styleUrls: ['./test-engine.component.css']
})
export class TestEngineComponent implements OnInit, OnDestroy {

  // ─── Route / session ────────────────────────────────────────────────────────
  attemptId  = '';
  testId     = '';
  link       = '';

  // ─── Test data ──────────────────────────────────────────────────────────────
  testTitle  = '';
  questions: any[] = [];
  answers:   { [qId: string]: number } = {};
  questionTimes: { [qId: string]: number } = {};
  questionStartTime = Date.now();
  currentQuestionIndex = 0;

  // ─── Question state ─────────────────────────────────────────────────────────
  flaggedQuestions: Set<string>  = new Set();
  visitedQuestions: Set<string>  = new Set();

  // ─── Timer ──────────────────────────────────────────────────────────────────
  timeLeft = 0;
  timerSubscription:    Subscription | null = null;
  autoSaveSubscription: Subscription | null = null;

  // ─── UI state ────────────────────────────────────────────────────────────────
  showNavPanel = false;

  // ─── Proctoring state ───────────────────────────────────────────────────────
  maxTabSwitches   = 3;
  suspicionScore   = 0;
  violationLog:    { type: string; timestamp: Date; score: number }[] = [];
  tabSwitchCount   = 0;
  showTabWarning   = false;
  warningMessage   = '';
  isSubmitting     = false;
  antiCheatingEnabled = false;

  // ─── Initialization guard (webcam popup + fullscreen request can blur window) ──
  isSystemInitializing = true;
  private initializationGrace = 15000;

  // ─── Webcam / face detection ─────────────────────────────────────────────
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;
  webcamStream:       MediaStream | null = null;
  faceApiLoaded       = false;
  monitoringInterval: any = null;
  snapshotInterval:   any = null;
  devToolsInterval:   any = null;
  private _faceapi:   any = null;     // face-api.js loaded dynamically

  // ─── Audio / microphone monitoring ───────────────────────────────────────
  private audioStream:   MediaStream | null = null;
  private audioContext:  AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioInterval: any = null;
  private highNoiseStart: number | null = null;
  private readonly NOISE_HIGH_THRESHOLD = 40;  // 0–255 RMS scale
  private readonly NOISE_SUSTAINED_MS   = 3000; // 3 seconds of sustained noise

  // ─── DevTools detection ──────────────────────────────────────────────────
  private devToolsOpen = false;

  // ─── Grace period (first 10s: violations logged but not scored) ──────────
  private sessionStartTime = 0;

  private apiUrl = environment.apiUrl;

  // ─── Computed helpers ────────────────────────────────────────────────────
  get currentQuestion()  { return this.questions[this.currentQuestionIndex]; }
  get answeredCount()    { return Object.keys(this.answers).length; }
  get progressPercent()  { return this.questions.length ? Math.round((this.answeredCount / this.questions.length) * 100) : 0; }
  get riskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (this.suspicionScore <= 30) return 'LOW';
    if (this.suspicionScore <= 70) return 'MEDIUM';
    return 'HIGH';
  }

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient,
    private zone:   NgZone
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  ngOnInit() {
    this.link      = this.route.snapshot.paramMap.get('link') || '';
    this.attemptId = this.route.snapshot.queryParamMap.get('attemptId') || '';

    if (!this.attemptId) {
      alert('Invalid session. Please start again.');
      this.router.navigate(['/test', this.link]);
      return;
    }

    // ── Request webcam + microphone permissions NOW (before violations tracked) ─
    this.startWebcam();
    this.startAudioMonitoring();

    // Clear initialization guard after grace period (webcam popup + fullscreen can blur)
    setTimeout(() => { this.isSystemInitializing = false; }, this.initializationGrace);

    this.loadAttemptAndQuestions();

    // Auto-save every 10 seconds
    this.autoSaveSubscription = interval(10000).subscribe(() => this.saveProgress());
  }

  ngOnDestroy() {
    this.cleanupAll();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  loadAttemptAndQuestions() {
    this.http.get(`${this.apiUrl}/attempts/${this.attemptId}`).subscribe({
      next: (attempt: any) => {
        this.testId = attempt.test?._id || attempt.test;
        const startTime = new Date(attempt.startTime).getTime();

        // Restore violation state
        if (attempt.suspicionScore)  this.suspicionScore  = attempt.suspicionScore;
        if (attempt.tabSwitchCount)  this.tabSwitchCount  = attempt.tabSwitchCount;
        if (attempt.violationLog)    this.violationLog    = attempt.violationLog;

        // Restore question times
        if (Array.isArray(attempt.answers)) {
          attempt.answers.forEach((ans: any) => {
            if (ans.timeSpent) this.questionTimes[ans.questionId] = ans.timeSpent;
          });
        }

        this.http.get(`${this.apiUrl}/tests/${this.testId}/questions`).subscribe({
          next: (data: any) => {
            this.testTitle          = data.title;
            this.questions          = data.questions;
            this.antiCheatingEnabled = !!data.antiCheating;
            this.maxTabSwitches     = Math.max(1, data.tabSwitchLimit ?? 3);
            this.timeLeft = Math.max(
              0,
              data.duration * 60 - Math.floor((Date.now() - startTime) / 1000)
            );

            // Restore saved answers
            if (Array.isArray(attempt.answers)) {
              attempt.answers.forEach((ans: any) => {
                const q = this.questions.find(q => q._id === ans.questionId);
                if (q?.options && ans.selectedOption) {
                  const idx = q.options.indexOf(ans.selectedOption);
                  if (idx !== -1) this.answers[ans.questionId] = idx;
                }
              });
            }

            this.questionStartTime = Date.now();
            this.startTimer();

            // Non-webcam proctoring (always on)
            this.setupFullscreen();
            this.setupCopyPasteBlocker();
            this.setupKeyboardBlocker();
            this.setupDevToolsDetection();
            // Webcam was already started in ngOnInit — no call needed here
          },
          error: () => {
            alert('Failed to load questions.');
            this.router.navigate(['/test', this.link]);
          }
        });
      },
      error: () => {
        alert('Failed to load attempt.');
        this.router.navigate(['/test', this.link]);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════════════════════

  startTimer() {
    this.sessionStartTime = Date.now();
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.handleViolation('TIME_EXPIRED');   // logged, then auto-submit
        this.autoSubmit();
      }
    });
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  QUESTION NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  selectOption(index: number) {
    if (this.currentQuestion) {
      this.answers[this.currentQuestion._id] = index;
    }
  }

  getSelectedOption(): number | null {
    return this.currentQuestion
      ? (this.answers[this.currentQuestion._id] ?? null)
      : null;
  }

  nextQuestion() {
    this.trackQuestionTime();
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.markVisited();
    }
  }

  prevQuestion() {
    this.trackQuestionTime();
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.markVisited();
    }
  }

  goToQuestion(index: number) {
    this.trackQuestionTime();
    this.currentQuestionIndex = index;
    this.markVisited();
  }

  flagQuestion() {
    const id = this.currentQuestion?._id;
    if (!id) return;
    this.flaggedQuestions.has(id)
      ? this.flaggedQuestions.delete(id)
      : this.flaggedQuestions.add(id);
  }

  clearAnswer() {
    if (this.currentQuestion) {
      delete this.answers[this.currentQuestion._id];
    }
  }

  isFlagged(qId: string)  { return this.flaggedQuestions.has(qId); }
  isAnswered(qId: string) { return this.answers[qId] !== undefined; }
  isVisited(qId: string)  { return this.visitedQuestions.has(qId); }

  getQuestionStatus(qId: string): 'answered' | 'flagged' | 'visited' | 'unanswered' {
    if (this.isAnswered(qId))  return 'answered';
    if (this.isFlagged(qId))   return 'flagged';
    if (this.isVisited(qId))   return 'visited';
    return 'unanswered';
  }

  private markVisited() {
    if (this.currentQuestion) this.visitedQuestions.add(this.currentQuestion._id);
  }

  trackQuestionTime() {
    if (this.currentQuestion) {
      const qId     = this.currentQuestion._id;
      const elapsed = Math.round((Date.now() - this.questionStartTime) / 1000);
      this.questionTimes[qId] = (this.questionTimes[qId] || 0) + elapsed;
    }
    this.questionStartTime = Date.now();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SAVE & SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════

  saveProgress() {
    if (!this.attemptId) return;
    this.trackQuestionTime();
    this.http.put(`${this.apiUrl}/attempts/${this.attemptId}/save`, {
      answers:         this.formatAnswers(),
      tabSwitchCount:  this.tabSwitchCount,
      suspicionScore:  this.suspicionScore,
      violationLog:    this.violationLog
    }).subscribe({ error: (e) => console.warn('Auto-save failed:', e) });
    this.questionStartTime = Date.now();
  }

  submitTest() {
    if (confirm('Are you sure you want to submit?')) this.doSubmit('MANUAL');
  }

  autoSubmit() {
    if (this.isSubmitting) return;
    this.showWarning('⚠️ Test auto-submitted due to violations or time expiry.');
    setTimeout(() => this.doSubmit('AUTO'), 2000);
  }

  private doSubmit(reason: 'MANUAL' | 'AUTO' = 'MANUAL') {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    this.trackQuestionTime();
    this.timerSubscription?.unsubscribe();
    this.autoSaveSubscription?.unsubscribe();
    this.cleanupProctoring();

    console.log('Submitting attempt:', this.attemptId, '| answers:', this.formatAnswers().length);
    this.http.post(`${this.apiUrl}/attempts/${this.attemptId}/submit`, {
      answers:         this.formatAnswers(),
      tabSwitchCount:  this.tabSwitchCount,
      suspicionScore:  this.suspicionScore,
      violationLog:    this.violationLog,
      autoSubmitted:   reason === 'AUTO'
    }).subscribe({
      next: (res: any) => {
        console.log('Submit success:', res);
        this.router.navigate(['/result', this.attemptId]);
      },
      error: (err: any) => {
        console.error('Submit error - status:', err?.status, '| body:', err?.error);
        this.isSubmitting = false;
        const msg = err?.error?.message || err?.error?.detail || err?.message || 'Unknown error';
        alert(`Submission failed (${err?.status || 'network error'}): ${msg}`);
      }
    });
  }

  private formatAnswers() {
    const allQIds = new Set([
      ...Object.keys(this.answers),
      ...Array.from(this.flaggedQuestions)
    ]);
    return Array.from(allQIds).map(qId => {
      const q = this.questions.find(fq => fq._id === qId);
      return {
        questionId:     qId,
        selectedOption: q && this.answers[qId] !== undefined ? q.options[this.answers[qId]] : null,
        isFlagged:      this.flaggedQuestions.has(qId),
        timeSpent:      this.questionTimes[qId] || 0
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ✅ CENTRAL VIOLATION HANDLER  (THIS WAS THE MAIN BUG — MISSING ENTIRELY)
  // ═══════════════════════════════════════════════════════════════════════════

  handleViolation(type: string) {
    if (this.isSubmitting) return;
    // Suppress focus-loss violations while system is initializing (webcam popup, fullscreen)
    if (this.isSystemInitializing && (type === 'WINDOW_BLUR' || type === 'FULLSCREEN_EXIT')) return;

    const weight    = VIOLATION_WEIGHTS[type] ?? 10;
    const prevScore = this.suspicionScore;
    const inGracePeriod = this.sessionStartTime > 0 && (Date.now() - this.sessionStartTime) < 10000;
    if (!inGracePeriod) {
      this.suspicionScore = Math.min(999, this.suspicionScore + weight);   // cap display at 999
    }

    // Log it locally
    this.violationLog.push({ type, timestamp: new Date(), score: this.suspicionScore });

    // Show warning overlay
    this.showWarning(this.getViolationMessage(type));

    // Persist to backend immediately
    this.logViolationToBackend(type, weight);

    console.warn(`[PROCTORING] ${type} | +${weight} pts | Score: ${prevScore} → ${this.suspicionScore}`);

    // ✅ Check auto-submit threshold
    this.checkMaxViolations();
  }

  private checkMaxViolations() {
    if (this.suspicionScore >= MAX_SUSPICION_SCORE && !this.isSubmitting) {
      console.warn('[PROCTORING] Score exceeded threshold — auto-submitting');
      this.autoSubmit();
    }
  }

  private logViolationToBackend(type: string, weight: number) {
    this.http.post(`${this.apiUrl}/attempts/${this.attemptId}/violation`, {
      type,
      weight,
      suspicionScore: this.suspicionScore,
      timestamp:      new Date().toISOString()
    }).subscribe({ error: (e) => console.warn('Violation log failed:', e) });
  }

  private getViolationMessage(type: string): string {
    const messages: Record<string, string> = {
      TAB_SWITCH:      '⚠️ Tab switch detected!',
      WINDOW_BLUR:     '⚠️ Window focus lost!',
      NO_FACE:         '⚠️ No face detected — please stay in frame!',
      MULTIPLE_FACES:  '⚠️ Multiple faces detected!',
      COPY_ATTEMPT:    '⚠️ Copying is not allowed!',
      PASTE_ATTEMPT:   '⚠️ Pasting is not allowed!',
      RIGHT_CLICK:     '⚠️ Right-click is disabled!',
      DEV_TOOLS:       '⚠️ Developer tools detected!',
      FULLSCREEN_EXIT: '⚠️ Please stay in fullscreen mode!',
      VOICE_DETECTED:  '⚠️ High background noise detected!',
    };
    return messages[type] || `⚠️ Violation: ${type}`;
  }

  private showWarning(msg: string) {
    this.zone.run(() => {
      this.warningMessage  = msg;
      this.showTabWarning  = true;
      setTimeout(() => { this.showTabWarning = false; }, 4000);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROCTORING INIT
  // ═══════════════════════════════════════════════════════════════════════════

  private async initProctoring() {
    this.setupFullscreen();
    this.setupCopyPasteBlocker();
    this.setupKeyboardBlocker();
    this.setupDevToolsDetection();
    await this.startWebcam();
  }

  // ─── Fullscreen ────────────────────────────────────────────────────────────

  private setupFullscreen() {
    const el = document.documentElement as any;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (rfs) rfs.call(el).catch(() => {});

    document.addEventListener('fullscreenchange',       this.onFullscreenChange.bind(this));
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange.bind(this));
  }

  private onFullscreenChange() {
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement
    );
    if (!isFullscreen && !this.isSubmitting) {
      this.handleViolation('FULLSCREEN_EXIT');
      // Re-request fullscreen after short delay
      setTimeout(() => {
        const el = document.documentElement as any;
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
        if (rfs) rfs.call(el).catch(() => {});
      }, 1000);
    }
  }

  // ─── Tab switch / blur ─────────────────────────────────────────────────────

  @HostListener('document:visibilitychange')
  visibilityChange() {
    if (document.hidden && !this.isSubmitting && !this.isSystemInitializing) {
      this.tabSwitchCount++;
      this.handleViolation('TAB_SWITCH');

      const limit = this.maxTabSwitches < 1 ? 1 : this.maxTabSwitches;

      if (this.tabSwitchCount >= limit) {
        this.showWarning(
          `⚠️ Maximum tab switches reached (${this.tabSwitchCount}/${limit}). Auto-submitting now...`
        );
        setTimeout(() => this.autoSubmit(), 1500);
      } else {
        this.showWarning(
          `⚠️ Tab switch detected! ${this.tabSwitchCount}/${limit} — test will auto-submit at ${limit} switches.`
        );
      }
    }
  }

  @HostListener('window:blur')
  windowBlur() {
    if (!this.isSubmitting && !this.isSystemInitializing) {
      this.handleViolation('WINDOW_BLUR');
      // Note: window blur only logs a violation — auto-submit is triggered by tab switches only
    }
  }

  // ─── Copy / Paste / Right-click ────────────────────────────────────────────

  private setupCopyPasteBlocker() {
    document.addEventListener('copy',  this.onCopy.bind(this));
    document.addEventListener('paste', this.onPaste.bind(this));
    document.addEventListener('cut',   this.onCopy.bind(this));
    // contextmenu is handled by @HostListener('contextmenu') — do NOT add it here
    // or onRightClick fires twice per right-click (+20 suspicion instead of +10)
  }

  private onCopy(e: Event)  { e.preventDefault(); this.handleViolation('COPY_ATTEMPT');  }
  private onPaste(e: Event) { e.preventDefault(); this.handleViolation('PASTE_ATTEMPT'); }

  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.handleViolation('RIGHT_CLICK');
  }

  // ─── Keyboard blocker (F12, Ctrl+Shift+I, etc.) ───────────────────────────

  private setupKeyboardBlocker() {
    // DevTools keyboard shortcuts detection disabled
  }

  private onKeyDown(e: KeyboardEvent) {
    // DevTools keyboard detection disabled
  }

  // ─── DevTools size detection ───────────────────────────────────────────────

  private setupDevToolsDetection() {
    // DevTools size detection disabled
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  WEBCAM & FACE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  async startWebcam() {
    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // Attach to video element after view init (slight delay to ensure DOM ready)
      setTimeout(() => {
        if (this.videoRef?.nativeElement && this.webcamStream) {
          this.videoRef.nativeElement.srcObject = this.webcamStream;
          this.videoRef.nativeElement.play();
          this.loadFaceApiAndMonitor();
        }
      }, 500);
    } catch {
      console.warn('[WEBCAM] Permission denied or unavailable');
      this.handleViolation('NO_FACE');   // treat no-webcam as a violation
    }
  }

  private async loadFaceApiAndMonitor() {
    try {
      // Dynamically import face-api.js (must be installed: npm i face-api.js)
      const faceapi = await import('face-api.js');
      this._faceapi  = faceapi;
      const MODEL_URL = '/assets/models';   // put face-api models here
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('[FACE-API] tinyFaceDetector model loaded successfully');
      this.faceApiLoaded = true;
      this.captureReferenceImage();
      this.startContinuousMonitoring();
    } catch (e) {
      console.error('[FACE-API] Failed to load models:', e);
    }
  }

  private startContinuousMonitoring() {
    // Face check every 5 seconds
    this.monitoringInterval = setInterval(() => this.detectFaces(), 5000);
    // Snapshot every 30 seconds
    this.snapshotInterval = setInterval(() => this.takePeriodicSnapshot(), 30000);
  }

  private async detectFaces() {
    const video = this.videoRef?.nativeElement;
    if (!this.faceApiLoaded || !video || video.readyState < 2 || this.isSubmitting) return;

    try {
      const detections = await this._faceapi.detectAllFaces(
        video,
        new this._faceapi.TinyFaceDetectorOptions()
      );

      const count = detections.length;

      if (count === 0) {
        this.handleViolation('NO_FACE');
        this.takeViolationSnapshot('NO_FACE');
      } else if (count > 1) {
        this.handleViolation('MULTIPLE_FACES');
        this.takeViolationSnapshot('MULTIPLE_FACES');
      }
    } catch (e) {
      console.warn('[FACE-API] Detection error:', e);
    }
  }

  // ─── Snapshots ─────────────────────────────────────────────────────────────

  captureReferenceImage() {
    this.captureAndUpload('REFERENCE');
  }

  takePeriodicSnapshot() {
    this.captureAndUpload('PERIODIC');
  }

  takeViolationSnapshot(reason: string) {
    this.captureAndUpload(`VIOLATION_${reason}`);
  }

  private captureAndUpload(label: string) {
    const video  = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas) {
      console.warn('[SNAPSHOT] Video or canvas element not available');
      return;
    }
    if (video.videoWidth === 0 || video.readyState < 2) {
      console.warn('[SNAPSHOT] Video not ready yet (videoWidth=0 or readyState<2), skipping');
      return;
    }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) {
        console.warn('[SNAPSHOT] Canvas blob is null');
        return;
      }
      console.log(`[SNAPSHOT] Uploading ${label} (${blob.size} bytes)`);
      const fd = new FormData();
      fd.append('snapshot', blob, `${label}_${Date.now()}.jpg`);
      fd.append('label', label);
      this.http.post(`${this.apiUrl}/attempts/${this.attemptId}/snapshot`, fd)
               .subscribe({
                 next: () => console.log(`[SNAPSHOT] Uploaded: ${label}`),
                 error: e => console.warn('[SNAPSHOT] Upload failed:', e)
               });
    }, 'image/jpeg', 0.7);
  }

  // ─── Stop webcam ───────────────────────────────────────────────────────────

  stopWebcam() {
    this.webcamStream?.getTracks().forEach(t => t.stop());
    this.webcamStream = null;
  }

  // ─── Audio monitoring ─────────────────────────────────────────────────────

  async startAudioMonitoring() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);

      const data = new Uint8Array(this.audioAnalyser.frequencyBinCount);
      this.audioInterval = setInterval(() => {
        if (this.isSubmitting || !this.audioAnalyser) return;
        this.audioAnalyser.getByteFrequencyData(data);
        const rms = data.reduce((s, v) => s + v, 0) / data.length;

        if (rms > this.NOISE_HIGH_THRESHOLD) {
          if (!this.highNoiseStart) {
            this.highNoiseStart = Date.now();
          } else if (Date.now() - this.highNoiseStart >= this.NOISE_SUSTAINED_MS) {
            this.handleViolation('VOICE_DETECTED');
            this.highNoiseStart = null; // reset timer after violation fires
          }
        } else {
          this.highNoiseStart = null; // noise dropped — reset
        }
      }, 200);
    } catch {
      console.warn('[AUDIO] Microphone permission denied or unavailable');
    }
  }

  stopAudioMonitoring() {
    clearInterval(this.audioInterval);
    this.audioStream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close();
    this.audioStream   = null;
    this.audioContext  = null;
    this.audioAnalyser = null;
    this.highNoiseStart = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  private cleanupProctoring() {
    this.stopWebcam();
    this.stopAudioMonitoring();
    clearInterval(this.monitoringInterval);
    clearInterval(this.snapshotInterval);
    clearInterval(this.devToolsInterval);
    document.removeEventListener('copy',              this.onCopy.bind(this));
    document.removeEventListener('paste',             this.onPaste.bind(this));
    document.removeEventListener('cut',               this.onCopy.bind(this));
    document.removeEventListener('keydown',           this.onKeyDown.bind(this));
    document.removeEventListener('fullscreenchange',  this.onFullscreenChange.bind(this));
  }

  private cleanupAll() {
    this.timerSubscription?.unsubscribe();
    this.autoSaveSubscription?.unsubscribe();
    this.cleanupProctoring();
  }
}
