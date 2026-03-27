import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-analytics-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './analytics-dashboard.component.html'
})
export class AnalyticsDashboardComponent implements OnInit {

    allTests: any[] = [];
    selectedTestIds: string[] = [];
    analytics: any = null;
    loading = false;
    loadingTests = true;
    error = '';
    expandedTestId: string | null = null;

    // Pass/fail cut-off
    cutoff: number = 60;
    editingCutoff: boolean = false;
    cutoffDraft: number = 60;

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

    toggleTest(id: string) {
        const idx = this.selectedTestIds.indexOf(id);
        if (idx > -1) this.selectedTestIds.splice(idx, 1);
        else this.selectedTestIds.push(id);
    }

    isTestSelected(id: string): boolean {
        return this.selectedTestIds.includes(id);
    }

    selectAll() {
        this.selectedTestIds = this.allTests.map((t: any) => t._id);
        this.loadAnalytics();
    }

    clearSelection() {
        this.selectedTestIds = [];
        this.analytics = null;
    }

    loadAnalytics() {
        if (this.selectedTestIds.length === 0) return;
        this.loading = true;
        this.error = '';
        const url = `admin/analytics?testIds=${this.selectedTestIds.join(',')}&cutoff=${this.cutoff}`;
        this.api.get(url).subscribe({
            next: (data: any) => {
                this.analytics = data;
                this.loading = false;
            },
            error: () => {
                this.error = 'Failed to load analytics';
                this.loading = false;
            }
        });
    }

    // Cut-off editing
    startEditCutoff() {
        this.cutoffDraft = this.cutoff;
        this.editingCutoff = true;
    }

    saveCutoff() {
        const val = Math.min(100, Math.max(1, Math.round(this.cutoffDraft)));
        this.cutoff = val;
        this.cutoffDraft = val;
        this.editingCutoff = false;
        // Re-run analytics with new cutoff if data already loaded
        if (this.analytics && this.selectedTestIds.length > 0) {
            this.loadAnalytics();
        }
    }

    cancelCutoff() {
        this.cutoffDraft = this.cutoff;
        this.editingCutoff = false;
    }

    toggleExpandedTest(id: string) {
        this.expandedTestId = this.expandedTestId === id ? null : id;
    }

    // ── Chart helpers ──
    getPassPercent(): number {
        if (!this.analytics?.summary?.totalAttempts) return 0;
        return Math.round((this.analytics.summary.passCount / this.analytics.summary.totalAttempts) * 100);
    }

    getFailPercent(): number {
        return 100 - this.getPassPercent();
    }

    getPassDeg(): number {
        return Math.round((this.getPassPercent() / 100) * 360);
    }

    getBarMax(): number {
        if (!this.analytics?.scoreDistribution) return 1;
        return Math.max(...this.analytics.scoreDistribution.map((b: any) => b.count), 1);
    }

    getBarWidth(count: number): number {
        return Math.round((count / this.getBarMax()) * 100);
    }

    getTimeBarMax(): number {
        if (!this.analytics?.performanceOverTime?.length) return 100;
        return Math.max(...this.analytics.performanceOverTime.map((d: any) => d.avgScore), 1);
    }

    getTimeBarHeight(avgScore: number): number {
        return Math.round((avgScore / this.getTimeBarMax()) * 100);
    }

    getHeatmapMax(heatmapGrid: any[]): number {
        if (!heatmapGrid) return 1;
        return Math.max(...heatmapGrid.flatMap((row: any) => row.buckets), 1);
    }

    getHeatColor(value: number, max: number): string {
        if (max === 0 || value === 0) return '#f1f5f9';
        const intensity = value / max;
        if (intensity < 0.25) return '#dbeafe';
        if (intensity < 0.5) return '#93c5fd';
        if (intensity < 0.75) return '#3b82f6';
        return '#1d4ed8';
    }

    getHeatTextColor(value: number, max: number): string {
        if (max === 0 || value === 0) return '#94a3b8';
        return (value / max) >= 0.5 ? '#ffffff' : '#1e293b';
    }

    getDifficultyColor(diff: string): string {
        switch (diff) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return '#94a3b8';
        }
    }

    formatTime(seconds: number): string {
        if (!seconds) return '—';
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }

    goBack() {
        this.router.navigate(['/admin']);
    }
}
