import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-analytics-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './analytics-dashboard.component.html'
})
export class AnalyticsDashboardComponent implements OnInit {
    allTests: any[] = [];
    selectedTestIds: Set<string> = new Set();
    analytics: any = null;
    loading = false;
    loadingTests = true;
    error = '';

    // Track which per-test section is expanded
    expandedTest: string | null = null;

    constructor(private api: ApiService, private router: Router) { }

    ngOnInit() {
        this.api.get('admin/analytics').subscribe({
            next: (data: any) => {
                this.allTests = data.tests || [];
                this.loadingTests = false;
            },
            error: () => {
                this.error = 'Failed to load tests';
                this.loadingTests = false;
            }
        });
    }

    toggleTest(testId: string) {
        if (this.selectedTestIds.has(testId)) {
            this.selectedTestIds.delete(testId);
        } else {
            this.selectedTestIds.add(testId);
        }
    }

    isTestSelected(testId: string): boolean {
        return this.selectedTestIds.has(testId);
    }

    selectAll() { this.allTests.forEach(t => this.selectedTestIds.add(t._id)); }

    clearSelection() {
        this.selectedTestIds.clear();
        this.analytics = null;
    }

    loadAnalytics() {
        if (this.selectedTestIds.size === 0) return;
        this.loading = true;
        this.error = '';
        const ids = Array.from(this.selectedTestIds).join(',');
        this.api.get(`admin/analytics?testIds=${ids}`).subscribe({
            next: (data: any) => {
                this.analytics = data.analytics;
                this.loading = false;
            },
            error: () => {
                this.error = 'Failed to load analytics';
                this.loading = false;
            }
        });
    }

    toggleExpandedTest(testId: string) {
        this.expandedTest = this.expandedTest === testId ? null : testId;
    }

    // ── Pass/Fail helpers ──
    getPassPercent(): number {
        if (!this.analytics?.summary?.totalAttempts) return 0;
        return Math.round((this.analytics.summary.passCount / this.analytics.summary.totalAttempts) * 100);
    }
    getFailPercent(): number { return 100 - this.getPassPercent(); }

    // ── Score distribution bar scale ──
    getBarWidth(count: number): number {
        if (!this.analytics?.scoreDistribution) return 0;
        const max = Math.max(...this.analytics.scoreDistribution.map((b: any) => b.count), 1);
        return Math.round((count / max) * 100);
    }

    // ── Performance over time: scale bar heights ──
    getTimeBarHeight(score: number): number {
        return Math.round((score / 100) * 100);
    }

    // ── Difficulty heatmap: colour by density ──
    getHeatColor(count: number, maxCount: number): string {
        if (maxCount === 0 || count === 0) return '#f1f5f9';
        const intensity = count / maxCount;
        if (intensity <= 0.25) return '#dbeafe';   // light blue — few questions here
        if (intensity <= 0.5)  return '#93c5fd';   // medium blue
        if (intensity <= 0.75) return '#3b82f6';   // blue
        return '#1d4ed8';                           // dark blue — many questions here
    }

    getHeatTextColor(count: number, maxCount: number): string {
        if (maxCount === 0 || count === 0) return '#94a3b8';
        const intensity = count / maxCount;
        return intensity > 0.5 ? '#ffffff' : '#1e293b';
    }

    getHeatmapMax(heatmapGrid: any[]): number {
        return Math.max(...heatmapGrid.flatMap((row: any) => row.buckets), 1);
    }

    formatTime(seconds: number): string {
        if (!seconds) return '—';
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }

    getDifficultyColor(diff: string): string {
        switch (diff) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return 'var(--text-light)';
        }
    }

    goBack() { this.router.navigate(['/admin']); }
}
