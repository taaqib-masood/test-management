import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
    // ✅ FIX: initialise every field the template uses so nothing is undefined on first render
    stats: any = {
        totalTests: 0,
        uniqueStudents: 0,
        totalAttempts: 0,
        avgScore: 0,
        totalQuestions: 0,
        recentAttempts: []
    };
    tests: any[] = [];
    isLoading = true;
    copiedLink = '';

    // Tracks which test IDs have their access code currently revealed
    revealedCodes: Set<string> = new Set();

    constructor(private api: ApiService, private authService: AuthService) { }

    ngOnInit() {
        this.loadStats();
        this.loadTests();
    }

    loadStats() {
        this.api.get('admin/stats').subscribe({
            next: (data: any) => {
                // ✅ FIX: merge so missing fields fall back to 0 instead of undefined
                this.stats = {
                    totalTests:     data.totalTests     ?? 0,
                    uniqueStudents: data.uniqueStudents ?? 0,
                    totalAttempts:  data.totalAttempts  ?? 0,
                    avgScore:       data.avgScore       ?? 0,
                    totalQuestions: data.totalQuestions ?? 0,
                    recentAttempts: data.recentAttempts ?? []
                };
            },
            error: (err: any) => {
                console.error('Stats load error:', err);
                // Leave defaults in place — don't crash
            }
        });
    }

    loadTests() {
        this.api.get('tests').subscribe({
            next: (data: any[]) => {
                // ✅ FIX: backend returns questionCount — map it to totalQuestions for the template
                // Also default attemptCount/avgScore so template conditionals don't break
                this.tests = (data || []).map(t => ({
                    ...t,
                    totalQuestions: t.questionCount ?? (t.questions?.length ?? 0),
                    attemptCount:   t.attemptCount  ?? 0,
                    avgScore:       t.avgScore      ?? 0
                }));
                this.isLoading = false;
            },
            error: (err: any) => {
                console.error('Tests load error:', err);
                this.isLoading = false;
            }
        });
    }

    getShareUrl(test: any): string {
        return `${window.location.origin}/test/${test.uniqueLink}`;
    }

    copyLink(test: any) {
        const url = this.getShareUrl(test);
        navigator.clipboard.writeText(url).then(() => {
            this.copiedLink = test._id;
            setTimeout(() => this.copiedLink = '', 2000);
        });
    }

    // Toggle the access code visibility for a specific test row
    toggleCodeVisibility(testId: string, event: Event) {
        event.stopPropagation();
        if (this.revealedCodes.has(testId)) {
            this.revealedCodes.delete(testId);
        } else {
            this.revealedCodes.add(testId);
        }
    }

    isCodeRevealed(testId: string): boolean {
        return this.revealedCodes.has(testId);
    }

    deleteTest(test: any) {
        const msg = `Delete "${test.title}"?\n\nThis will permanently delete the test and all ${test.attemptCount || 0} student attempts. This cannot be undone.`;
        if (confirm(msg)) {
            this.api.delete(`tests/${test._id}`).subscribe({
                next: () => {
                    this.tests = this.tests.filter(t => t._id !== test._id);
                    // Also clean up the revealed set when a test is deleted
                    this.revealedCodes.delete(test._id);
                    this.loadStats();
                },
                error: () => alert('Failed to delete test')
            });
        }
    }

    toggleTest(test: any) {
        this.api.put(`tests/${test._id}/toggle`, {}).subscribe({
            next: (updated: any) => {
                test.isActive = updated.isActive;
            },
            error: () => alert('Failed to toggle test')
        });
    }

    logout() {
        this.authService.logout();
    }
}
