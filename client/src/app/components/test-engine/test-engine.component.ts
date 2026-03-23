import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-test-engine',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './test-engine.component.html',
    styleUrls: ['./test-engine.component.css']
})
export class TestEngineComponent implements OnInit, OnDestroy {
    attemptId = '';
    testId = '';
    link = '';
    currentQuestionIndex = 0;
    timeLeft = 0;
    timerSubscription: Subscription | null = null;
    autoSaveSubscription: Subscription | null = null;

    testTitle = '';
    questions: any[] = [];
    answers: { [key: string]: number } = {};
    questionTimes: { [key: string]: number } = {};
    questionStartTime: number = Date.now();

    // Tab switch settings loaded from test
    tabSwitchLimit = 3;   // -1 = block, 0 = off, N = limit

    // Runtime tab switch state
    tabSwitchCount = 0;
    showTabWarning = false;
    tabWarningMessage = '';
    isBlocked = false;    // true briefly when in block mode to show overlay

    private apiUrl = environment.apiUrl;

    get currentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    get timeRemaining() {
        return this.timeLeft;
    }

    // Whether tab switching is completely blocked (no submit)
    get isBlockMode(): boolean {
        return this.tabSwitchLimit === -1;
    }

    // Whether auto-submit after N switches
    get isLimitMode(): boolean {
        return this.tabSwitchLimit > 0;
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.link = this.route.snapshot.paramMap.get('link') || '';
        this.attemptId = this.route.snapshot.queryParamMap.get('attemptId') || '';

        if (!this.attemptId) {
            alert('Invalid session. Please start again.');
            this.router.navigate(['/test', this.link]);
            return;
        }

        this.loadAttemptAndQuestions();

        this.autoSaveSubscription = interval(10000).subscribe(() => {
            this.saveProgress();
        });
    }

    loadAttemptAndQuestions() {
        this.http.get(`${this.apiUrl}/attempts/${this.attemptId}`).subscribe({
            next: (attempt: any) => {
                this.testId = attempt.test?._id || attempt.test;
                const startTime = new Date(attempt.startTime).getTime();

                if (attempt.answers && Array.isArray(attempt.answers)) {
                    attempt.answers.forEach((ans: any) => {
                        if (ans.timeSpent) this.questionTimes[ans.questionId] = ans.timeSpent;
                    });
                }
                if (attempt.tabSwitchCount) {
                    this.tabSwitchCount = attempt.tabSwitchCount;
                }

                this.http.get(`${this.apiUrl}/tests/${this.testId}/questions`).subscribe({
                    next: (data: any) => {
                        this.testTitle = data.title;
                        this.questions = data.questions;
                        this.timeLeft = Math.max(0, (data.duration * 60) - Math.floor((Date.now() - startTime) / 1000));

                        // Load tabSwitchLimit from test (-1, 0, or N)
                        this.tabSwitchLimit = data.tabSwitchLimit !== undefined ? data.tabSwitchLimit : 3;

                        if (attempt.answers && Array.isArray(attempt.answers)) {
                            attempt.answers.forEach((ans: any) => {
                                const q = this.questions.find(q => q._id === ans.questionId);
                                if (q && q.options && ans.selectedOption) {
                                    const idx = q.options.indexOf(ans.selectedOption);
                                    if (idx !== -1) this.answers[ans.questionId] = idx;
                                }
                            });
                        }

                        this.questionStartTime = Date.now();
                        this.startTimer();
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

    startTimer() {
        this.timerSubscription = interval(1000).subscribe(() => {
            if (this.timeLeft > 0) this.timeLeft--;
            else this.autoSubmit();
        });
    }

    formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }

    trackQuestionTime() {
        if (this.currentQuestion) {
            const qId = this.currentQuestion._id;
            const elapsed = Math.round((Date.now() - this.questionStartTime) / 1000);
            this.questionTimes[qId] = (this.questionTimes[qId] || 0) + elapsed;
        }
        this.questionStartTime = Date.now();
    }

    selectOption(index: number) {
        if (this.currentQuestion) {
            this.answers[this.currentQuestion._id] = index;
        }
    }

    getSelectedOption(): number | null {
        if (this.currentQuestion) {
            return this.answers[this.currentQuestion._id] !== undefined
                ? this.answers[this.currentQuestion._id] : null;
        }
        return null;
    }

    nextQuestion() {
        this.trackQuestionTime();
        if (this.currentQuestionIndex < this.questions.length - 1) this.currentQuestionIndex++;
    }

    prevQuestion() {
        this.trackQuestionTime();
        if (this.currentQuestionIndex > 0) this.currentQuestionIndex--;
    }

    saveProgress() {
        if (this.attemptId) {
            this.trackQuestionTime();
            const formattedAnswers = this.formatAnswers();
            this.http.put(`${this.apiUrl}/attempts/${this.attemptId}/save`, {
                answers: formattedAnswers,
                tabSwitchCount: this.tabSwitchCount
            }).subscribe();
            this.questionStartTime = Date.now();
        }
    }

    private formatAnswers() {
        return Object.keys(this.answers).map(qId => {
            const q = this.questions.find(fq => fq._id === qId);
            return {
                questionId: qId,
                selectedOption: q ? q.options[this.answers[qId]] : null,
                timeSpent: this.questionTimes[qId] || 0
            };
        });
    }

    submitTest() {
        if (confirm('Are you sure you want to submit?')) this.doSubmit();
    }

    autoSubmit() {
        this.doSubmit();
    }

    private doSubmit() {
        this.trackQuestionTime();
        this.timerSubscription?.unsubscribe();
        this.autoSaveSubscription?.unsubscribe();

        const formattedAnswers = this.formatAnswers();
        this.http.post(`${this.apiUrl}/attempts/${this.attemptId}/submit`, {
            answers: formattedAnswers,
            tabSwitchCount: this.tabSwitchCount
        }).subscribe({
            next: () => this.router.navigate(['/result', this.attemptId]),
            error: () => alert('Submission failed. Please try again.')
        });
    }

    @HostListener('document:visibilitychange')
    onVisibilityChange() {
        if (!document.hidden) return;  // only act when tab is hidden

        // Off mode — do nothing
        if (this.tabSwitchLimit === 0) return;

        if (this.isBlockMode) {
            // Block mode — refocus immediately, show brief overlay, no submit
            this.isBlocked = true;
            this.tabWarningMessage = '🚫 Tab switching is not allowed during this test.';
            this.showTabWarning = true;
            setTimeout(() => {
                this.showTabWarning = false;
                this.isBlocked = false;
                window.focus();
            }, 2500);
            // Force focus back
            window.focus();
            return;
        }

        if (this.isLimitMode) {
            // Limit mode — count switch, warn, auto-submit if over limit
            this.tabSwitchCount++;
            const remaining = this.tabSwitchLimit - this.tabSwitchCount;

            if (remaining <= 0) {
                this.tabWarningMessage = `⚠️ Too many tab switches (${this.tabSwitchCount}/${this.tabSwitchLimit}). Auto-submitting your test now.`;
                this.showTabWarning = true;
                setTimeout(() => this.autoSubmit(), 2000);
            } else {
                this.tabWarningMessage = `⚠️ Tab switch detected! (${this.tabSwitchCount}/${this.tabSwitchLimit}) — ${remaining} more will auto-submit your test.`;
                this.showTabWarning = true;
                setTimeout(() => this.showTabWarning = false, 4000);
            }
        }
    }

    @HostListener('window:blur')
    onWindowBlur() {
        // Also catch window losing focus (e.g. Alt+Tab to another app)
        if (this.tabSwitchLimit === 0) return;

        if (this.isBlockMode) {
            // Refocus the window
            setTimeout(() => window.focus(), 100);
        }
    }

    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent) {
        event.preventDefault();
    }

    ngOnDestroy() {
        this.timerSubscription?.unsubscribe();
        this.autoSaveSubscription?.unsubscribe();
    }
}
