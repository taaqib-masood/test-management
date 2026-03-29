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

    // Multi-category — shared between auto and manual modes
    selectedCategories: string[] = [];
    categories: string[] = [];

    // Tab switch mode:
    //   'off'   = no restriction
    //   'limit' = auto-submit after N switches
    //   'block' = prevent switching entirely (no submit, just blocked)
    tabSwitchMode: 'off' | 'limit' = 'limit';
    tabSwitchLimit: number = 3;

    isLoading = false;
    availableQuestions: any[] = [];
    filteredQuestions: any[] = [];
    questionsLoading = true;
    createdLink = '';

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

    // Multi-category toggle — works for both auto and manual modes
    toggleCategory(cat: string) {
        const idx = this.selectedCategories.indexOf(cat);
        if (idx > -1) this.selectedCategories.splice(idx, 1);
        else this.selectedCategories.push(cat);
        this.applyCategories();
    }

    isCategorySelected(cat: string): boolean {
        return this.selectedCategories.includes(cat);
    }

    clearCategories() {
        this.selectedCategories = [];
        this.filteredQuestions = [...this.availableQuestions];
    }

    applyCategories() {
        if (this.selectedCategories.length === 0) {
            this.filteredQuestions = [...this.availableQuestions];
        } else {
            this.filteredQuestions = this.availableQuestions.filter(
                (q: any) => this.selectedCategories.includes(q.category || 'General')
            );
        }
    }

    autoSelectQuestions() {
        const total = this.test.totalQuestions;
        const easyNeeded = Math.round((this.easyPercent / 100) * total);
        const hardNeeded = Math.round((this.hardPercent / 100) * total);
        const mediumNeeded = total - easyNeeded - hardNeeded;

        const pool = this.filteredQuestions;

        const easyPool = this.shuffle(pool.filter((q: any) => q.difficulty === 'easy'));
        const mediumPool = this.shuffle(pool.filter((q: any) => q.difficulty === 'medium'));
        const hardPool = this.shuffle(pool.filter((q: any) => q.difficulty === 'hard'));

        const selected: string[] = [];
        selected.push(...easyPool.slice(0, easyNeeded).map((q: any) => q._id));
        selected.push(...mediumPool.slice(0, mediumNeeded).map((q: any) => q._id));
        selected.push(...hardPool.slice(0, hardNeeded).map((q: any) => q._id));

        if (selected.length < total) {
            const remaining = pool.filter((q: any) => !selected.includes(q._id));
            selected.push(...this.shuffle(remaining).slice(0, total - selected.length).map((q: any) => q._id));
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
            if (changed === 'easy') this.mediumPercent = Math.max(0, this.mediumPercent - diff);
            else if (changed === 'hard') this.mediumPercent = Math.max(0, this.mediumPercent - diff);
            else this.hardPercent = Math.max(0, this.hardPercent - diff);
        }
    }

    get totalPercent() {
        return this.easyPercent + this.mediumPercent + this.hardPercent;
    }

    toggleQuestion(id: string) {
        const idx = this.test.selectedQuestions.indexOf(id);
        if (idx > -1) this.test.selectedQuestions.splice(idx, 1);
        else this.test.selectedQuestions.push(id);
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

    // Resolves to value sent to backend:
    //   -1 = block completely
    //    0 = off (unlimited)
    //    N = auto-submit after N switches
    get resolvedTabSwitchLimit(): number {
        if (this.tabSwitchMode === 'off') return 0;
        return Math.max(1, this.tabSwitchLimit);
    }

    onSubmit() {
        if (this.test.selectedQuestions.length === 0) {
            alert('Please select at least one question');
            return;
        }
        this.isLoading = true;

        const payload: any = {
            title: this.test.title,
            duration: this.test.duration,
            totalQuestions: this.test.selectedQuestions.length,
            shuffleQuestions: this.test.shuffleQuestions,
            shuffleOptions: this.test.shuffleOptions,
            showResults: this.test.showResults,
            allowMultipleAttempts: this.test.allowMultipleAttempts,
            questions: this.test.selectedQuestions,
            accessCode: this.test.useAccessCode ? this.test.accessCode : '',
            expiryDate: this.test.useExpiry ? this.test.expiryDate : null,
            tabSwitchLimit: this.resolvedTabSwitchLimit
        };

        this.api.post('tests', payload).subscribe({
            next: (data) => {
                this.isLoading = false;
                this.createdLink = `${window.location.origin}/test/${data.uniqueLink}`;
            },
            error: (err: any) => {
                this.isLoading = false;
                console.error('Create test error:', err);
                const msg = err?.error?.message || err?.message || 'Failed to create test';
                alert('Failed to create test: ' + msg);
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
