import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
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

    // Access code reveal
    revealedCodes: Set<string> = new Set();

    // Access code inline editing
    editingCodeId: string | null = null;   // which test row is currently being edited
    editCodeValue: string = '';            // current value in the input box
    savingCodeId: string | null = null;    // which test is mid-save (shows spinner)

    constructor(private api: ApiService, private authService: AuthService) { }

    ngOnInit() {
        this.loadStats();
        this.loadTests();
    }

    loadStats() {
        this.api.get('admin/stats').subscribe({
            next: (data: any) => {
                this.stats = {
                    totalTests:     data.totalTests     ?? 0,
                    uniqueStudents: data.uniqueStudents ?? 0,
                    totalAttempts:  data.totalAttempts  ?? 0,
                    avgScore:       data.avgScore       ?? 0,
                    totalQuestions: data.totalQuestions ?? 0,
                    recentAttempts: data.recentAttempts ?? []
                };
            },
            error: (err: any) => console.error('Stats load error:', err)
        });
    }

    loadTests() {
        this.api.get('tests').subscribe({
            next: (data: any[]) => {
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

    emailInvite(test: any) {
        const url = this.getShareUrl(test);
        const accessCodeLine = test.accessCode ? `\nAccess Code: ${test.accessCode}\n` : '';
        const bodyText = `Hello,\n\nYou have been invited to take the following assessment: ${test.title}.\n\nTest Link: ${url}\n${accessCodeLine}\nPlease ensure you use a stable internet connection.\n\nRegards,\nAssessment Team`;
        const subject = encodeURIComponent(`Invitation to Assessment: ${test.title}`);
        const body = encodeURIComponent(bodyText);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }

    // ── Access code reveal ──────────────────────────────────────────
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

    // ── Access code inline edit ─────────────────────────────────────

    // Enter edit mode for a specific test row
    startEditCode(test: any, event: Event) {
        event.stopPropagation();
        this.editingCodeId = test._id;
        // Pre-fill with the current access code (or empty string if none)
        this.editCodeValue = test.accessCode || '';
        // Also reveal the code so admin can see what they're editing
        this.revealedCodes.add(test._id);
    }

    // Cancel edit without saving
    cancelEditCode(event: Event) {
        event.stopPropagation();
        this.editingCodeId = null;
        this.editCodeValue = '';
    }

    // Save the updated access code to the backend
    saveAccessCode(test: any, event: Event) {
        event.stopPropagation();
        const newCode = this.editCodeValue.trim();
        this.savingCodeId = test._id;

        this.api.put(`tests/${test._id}/access-code`, { accessCode: newCode }).subscribe({
            next: () => {
                // Update the local test object so the table reflects the change immediately
                test.accessCode = newCode || null;
                this.editingCodeId = null;
                this.editCodeValue = '';
                this.savingCodeId = null;
                // Keep it revealed after save so admin can confirm the change
                if (newCode) {
                    this.revealedCodes.add(test._id);
                } else {
                    this.revealedCodes.delete(test._id);
                }
            },
            error: () => {
                alert('Failed to update access code. Please try again.');
                this.savingCodeId = null;
            }
        });
    }

    isEditingCode(testId: string): boolean {
        return this.editingCodeId === testId;
    }

    isSavingCode(testId: string): boolean {
        return this.savingCodeId === testId;
    }

    // ── Other actions ───────────────────────────────────────────────
    deleteTest(test: any) {
        const msg = `Delete "${test.title}"?\n\nThis will permanently delete the test and all ${test.attemptCount || 0} student attempts. This cannot be undone.`;
        if (confirm(msg)) {
            this.api.delete(`tests/${test._id}`).subscribe({
                next: () => {
                    this.tests = this.tests.filter(t => t._id !== test._id);
                    this.revealedCodes.delete(test._id);
                    if (this.editingCodeId === test._id) {
                        this.editingCodeId = null;
                        this.editCodeValue = '';
                    }
                    this.loadStats();
                },
                error: () => alert('Failed to delete test')
            });
        }
    }

    toggleTest(test: any) {
        this.api.put(`tests/${test._id}/toggle`, {}).subscribe({
            next: (updated: any) => { test.isActive = updated.isActive; },
            error: () => alert('Failed to toggle test')
        });
    }

    logout() {
        this.authService.logout();
    }
}
