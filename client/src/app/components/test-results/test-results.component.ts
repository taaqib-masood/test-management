import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-test-results',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './test-results.component.html',
    styleUrls: []
})
export class TestResultsComponent implements OnInit {
    testId = '';
    loading = true;
    test: any = null;
    attempts: any[] = [];
    expandedAttempt: string | null = null;
    error = '';
    exporting = false;

    // Per-question analytics
    questionAnalytics: any[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private api: ApiService
    ) { }

    ngOnInit() {
        this.testId = this.route.snapshot.paramMap.get('id') || '';
        this.loadResults();
    }

    loadResults() {
        this.loading = true;
        this.api.get(`admin/tests/${this.testId}/results`).subscribe({
            next: (data: any) => {
                this.test = data.test;
                this.attempts = data.attempts;
                this.computeAnalytics();
                this.loading = false;
            },
            error: (err) => {
                this.error = err.error?.message || 'Failed to load results';
                this.loading = false;
            }
        });
    }

    computeAnalytics() {
        if (!this.test?.questions || this.attempts.length === 0) return;

        this.questionAnalytics = this.test.questions.map((q: any) => {
            let correct = 0;
            let totalTime = 0;
            let answered = 0;

            this.attempts.forEach(attempt => {
                const ans = attempt.answers?.find((a: any) => a.questionId === q._id);
                if (ans) {
                    answered++;
                    if (ans.isCorrect) correct++;
                    totalTime += (ans.timeSpent || 0);
                }
            });

            return {
                _id: q._id,
                text: q.text,
                difficulty: q.difficulty || 'medium',
                correctCount: correct,
                wrongCount: answered - correct,
                totalAttempts: answered,
                correctPercent: answered > 0 ? Math.round((correct / answered) * 100) : 0,
                avgTime: answered > 0 ? Math.round(totalTime / answered) : 0
            };
        });
    }

    toggleExpand(attemptId: string) {
        this.expandedAttempt = this.expandedAttempt === attemptId ? null : attemptId;
    }

    getPercentage(attempt: any): number {
        return attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0;
    }

    formatTime(seconds: number): string {
        if (!seconds) return '—';
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }

    getQuestionText(questionId: string): string {
        if (!this.test?.questions) return 'Unknown';
        const q = this.test.questions.find((q: any) => q._id === questionId);
        return q ? q.text : 'Unknown';
    }

    getCorrectAnswer(questionId: string): string {
        if (!this.test?.questions) return '—';
        const q = this.test.questions.find((q: any) => q._id === questionId);
        return q ? q.correctAnswer : '—';
    }

    goBack() {
        this.router.navigate(['/admin']);
    }

    getShareUrl(): string {
        return `${window.location.origin}/test/${this.test?.uniqueLink}`;
    }

    copyLink() {
        navigator.clipboard.writeText(this.getShareUrl());
    }

    // Export Results to Excel
    exportToExcel() {
        this.exporting = true;
        this.api.getBlob(`admin/tests/${this.testId}/export`).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.test?.title || 'results'}_export.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.exporting = false;
            },
            error: () => {
                alert('Failed to export results');
                this.exporting = false;
            }
        });
    }

    getDifficultyColor(diff: string): string {
        switch (diff) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return 'var(--text-light)';
        }
    }
}
