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
    attemptId: string = '';
    testId: string = '';
    link: string = '';
    currentQuestionIndex = 0;
    timeLeft = 0;
    timerSubscription: Subscription | null = null;
    autoSaveSubscription: Subscription | null = null;

    testTitle = '';
    questions: any[] = [];
    answers: { [key: string]: number } = {};
    questionTimes: { [key: string]: number } = {};
    questionStartTime: number = Date.now();

    // ✅ ADD: loading and error states so template doesn't show blank silently
    isLoading = true;
    loadError = '';

    warnings = 0;
    tabSwitchCount = 0;
    showTabWarning = false;

    private apiUrl = environment.apiUrl;

    get currentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    get timeRemaining() {
        return this.timeLeft;
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
        this.isLoading = true;
        this.loadError = '';

        // Step 1: fetch the attempt to get testId and startTime
        this.http.get(`${this.apiUrl}/attempts/${this.attemptId}`).subscribe({
            next: (attempt: any) => {

                // ✅ FIX: handle both populated object and plain ObjectId string
                this.testId = (attempt.test && typeof attempt.test === 'object')
                    ? attempt.test._id
                    : attempt.test;

                if (!this.testId) {
                    this.loadError = 'Could not determine test ID from attempt.';
                    this.isLoading = false;
                    return;
                }

                const startTime = new Date(attempt.startTime).getTime();

                // Restore tab switch count
                if (attempt.tabSwitchCount) {
                    this.tabSwitchCount = attempt.tabSwitchCount;
                    this.warnings = attempt.tabSwitchCount;
                }

                // Step 2: fetch questions for this test
                this.http.get(`${this.apiUrl}/tests/${this.testId}/questions`).subscribe({
                    next: (data: any) => {
                        this.testTitle = data.title || 'Assessment';

                        // ✅ FIX: guard against null/undefined questions array
                        this.questions = Array.isArray(data.questions) ? data.questions.filter((q: any) => q !== null) : [];

                        if (this.questions.length === 0) {
                            this.loadError = 'This test has no questions yet. Please contact your administrator.';
                            this.isLoading = false;
                            return;
                        }

                        // Calculate remaining time accounting for time already elapsed
                        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                        this.timeLeft = Math.max(0, (data.duration * 60) - elapsedSeconds);

                        // Restore previously saved answers
                        if (attempt.answers && Array.isArray(attempt.answers)) {
                            attempt.answers.forEach((ans: any) => {
                                const q = this.questions.find((q: any) => q._id === ans.questionId);
                                if (q && q.options && ans.selectedOption) {
                                    const idx = q.options.indexOf(ans.selectedOption);
                                    if (idx !== -1) {
                                        this.answers[ans.questionId] = idx;
                                    }
                                }
                                // Restore time spent per question
                                if (ans.timeSpent) {
                                    this.questionTimes[ans.questionId] = ans.timeSpent;
                                }
                            });
                        }

                        this.questionStartTime = Date.now();
                        this.isLoading = false;
                        this.startTimer();
                    },
                    error: (err: any) => {
                        console.error('Failed to load questions:', err);
                        this.loadError = 'Failed to load questions. Please try again.';
                        this.isLoading = false;
                    }
                });
            },
            error: (err: any) => {
                console.error('Failed to load attempt:', err);
                this.loadError = 'Failed to load your session. Please start again.';
                this.isLoading = false;
            }
        });
    }

    startTimer() {
        this.timerSubscription = interval(1000).subscribe(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
            } else {
                this.autoSubmit();
            }
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
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
        }
    }

    prevQuestion() {
        this.trackQuestionTime();
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
        }
    }

    saveProgress() {
        if (!this.attemptId || this.questions.length === 0) return;
        this.trackQuestionTime();
        const formattedAnswers = this.formatAnswers();
        this.http.put(`${this.apiUrl}/attempts/${this.attemptId}/save`, {
            answers: formattedAnswers,
            tabSwitchCount: this.tabSwitchCount
        }).subscribe({
            error: (err) => console.error('Auto-save failed:', err)
        });
        this.questionStartTime = Date.now();
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
        if (confirm('Are you sure you want to submit?')) {
            this.doSubmit();
        }
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
            next: () => {
                this.router.navigate(['/result', this.attemptId]);
            },
            error: () => {
                alert('Submission failed. Please try again.');
            }
        });
    }

    @HostListener('document:visibilitychange')
    visibilityChange() {
        if (document.hidden) {
            this.warnings++;
            this.tabSwitchCount++;
            this.showTabWarning = true;
            setTimeout(() => this.showTabWarning = false, 5000);
            if (this.warnings >= 3) {
                this.autoSubmit();
            }
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
