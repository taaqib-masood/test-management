import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-create-test',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './create-test.component.html'
})
export class CreateTestComponent implements OnInit {
    test = {
        title: '',
        duration: 30,
        totalQuestions: 10,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: false,
        accessCode: '',
        useAccessCode: false,
        allowMultipleAttempts: true,
        expiryDate: '',
        useExpiry: false,
        selectedQuestions: [] as string[]
    };

    difficultyMode: 'manual' | 'auto' = 'auto';
    easyPercent = 30;
    mediumPercent = 40;
    hardPercent = 30;

    selectedCategory = '';
    categories: string[] = [];

    isLoading = false;
    availableQuestions: any[] = [];
    filteredQuestions: any[] = [];
    questionsLoading = true;
    createdLink = '';
    createError = '';

    easyCount = 0;
    mediumCount = 0;
    hardCount = 0;

    constructor(private api: ApiService, private router: Router) { }

    ngOnInit() {
        this.loadQuestions();
    }

    loadQuestions() {
        this.api.get('tests/questions/all').subscribe({
            next: (qs) => {
                this.availableQuestions = qs;
                this.filteredQuestions = qs;
                this.questionsLoading = false;
                this.computeStats();
                this.extractCategories();
            },
            error: () => this.questionsLoading = false
        });
    }

    extractCategories() {
        const cats = new Set(this.availableQuestions.map((q: any) => q.category || 'General'));
        this.categories = Array.from(cats).sort();
    }

    computeStats() {
        this.easyCount = this.availableQuestions.filter((q: any) => q.difficulty === 'easy').length;
        this.mediumCount = this.availableQuestions.filter((q: any) => q.difficulty === 'medium').length;
        this.hardCount = this.availableQuestions.filter((q: any) => q.difficulty === 'hard').length;
    }

    filterByCategory() {
        if (this.selectedCategory) {
            this.filteredQuestions = this.availableQuestions.filter(
                (q: any) => q.category === this.selectedCategory
            );
        } else {
            this.filteredQuestions = [...this.availableQuestions];
        }
    }

    autoSelectQuestions() {
        const total = this.test.totalQuestions;
        const easyNeeded = Math.round((this.easyPercent / 100) * total);
        const hardNeeded = Math.round((this.hardPercent / 100) * total);
        const mediumNeeded = total - easyNeeded - hardNeeded;

        const pool = this.selectedCategory
            ? this.availableQuestions.filter((q: any) => q.category === this.selectedCategory)
            : [...this.availableQuestions];

        const easyPool = this.shuffle(pool.filter((q: any) => q.difficulty === 'easy'));
        const mediumPool = this.shuffle(pool.filter((q: any) => q.difficulty === 'medium'));
        const hardPool = this.shuffle(pool.filter((q: any) => q.difficulty === 'hard'));

        const selected: string[] = [];
        selected.push(...easyPool.slice(0, easyNeeded).map((q: any) => q._id));
        selected.push(...mediumPool.slice(0, mediumNeeded).map((q: any) => q._id));
        selected.push(...hardPool.slice(0, hardNeeded).map((q: any) => q._id));

        if (selected.length < total) {
            const remaining = pool.filter((q: any) => !selected.includes(q._id));
            const needed = total - selected.length;
            selected.push(...this.shuffle(remaining).slice(0, needed).map((q: any) => q._id));
        }

        this.test.selectedQuestions = selected;
    }

    private shuffle(arr: any[]) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    adjustPercent(changed: 'easy' | 'medium' | 'hard') {
        const total = this.easyPercent + this.mediumPercent + this.hardPercent;
        if (total !== 100) {
            const diff = total - 100;
            if (changed === 'easy') {
                this.mediumPercent = Math.max(0, this.mediumPercent - diff);
            } else if (changed === 'hard') {
                this.mediumPercent = Math.max(0, this.mediumPercent - diff);
            } else {
                this.hardPercent = Math.max(0, this.hardPercent - diff);
            }
        }
    }

    get totalPercent() {
        return this.easyPercent + this.mediumPercent + this.hardPercent;
    }

    toggleQuestion(id: string) {
        const idx = this.test.selectedQuestions.indexOf(id);
        if (idx > -1) {
            this.test.selectedQuestions.splice(idx, 1);
        } else {
            this.test.selectedQuestions.push(id);
        }
    }

    isSelected(id: string): boolean {
        return this.test.selectedQuestions.includes(id);
    }

    selectAll() {
        this.test.selectedQuestions = this.filteredQuestions.map((q: any) => q._id);
    }

    deselectAll() {
        this.test.selectedQuestions = [];
    }

    getDifficultyColor(diff: string): string {
        switch (diff) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return 'var(--text-light)';
        }
    }

    onSubmit() {
        if (!this.test.title.trim()) {
            alert('Please enter a test title');
            return;
        }
        if (this.test.selectedQuestions.length === 0) {
            alert('Please select at least one question');
            return;
        }

        this.isLoading = true;
        this.createError = '';

        // ✅ FIX: Send ONLY the fields the backend schema expects.
        // Do NOT spread this.test — it contains UI-only fields like
        // selectedQuestions, useAccessCode, useExpiry that break the backend.
        const payload = {
            title: this.test.title.trim(),
            duration: this.test.duration,
            shuffleQuestions: this.test.shuffleQuestions,
            shuffleOptions: this.test.shuffleOptions,
            showResults: this.test.showResults,
            allowMultipleAttempts: this.test.allowMultipleAttempts,
            accessCode: this.test.useAccessCode ? this.test.accessCode.trim() : null,
            expiryDate: this.test.useExpiry ? this.test.expiryDate : null,
            // ✅ FIX: backend expects 'questions' (array of IDs), not 'selectedQuestions'
            questions: this.test.selectedQuestions
        };

        this.api.post('tests', payload).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                if (data.uniqueLink) {
                    this.createdLink = `${window.location.origin}/test/${data.uniqueLink}`;
                } else {
                    // Fallback: show dashboard if link missing
                    this.createError = 'Test created but link generation failed. Check the dashboard.';
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                const msg = err?.error?.message || 'Failed to create test. Please try again.';
                this.createError = msg;
                alert(msg);
            }
        });
    }

    copyLink() {
        navigator.clipboard.writeText(this.createdLink);
    }

    goToDashboard() {
        this.router.navigate(['/admin']);
    }
}
