import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Attempt {
  id: string;
  student: any;
  suspicionScore: number;
  riskLevel: string;
  violationCount: number;
  snapshotCount: number;
  autoSubmitted: boolean;
  completedAt: Date;
}

interface Stats {
  totalAttempts: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  autoSubmittedCount: number;
  violationStats: {
    tabSwitches: number;
    noFace: number;
    multipleFaces: number;
    devTools: number;
    copyPaste: number;
  };
}

@Component({
  selector: 'app-proctoring-dashboard',
  templateUrl: './proctoring-dashboard.component.html',
  styleUrls: ['./proctoring-dashboard.component.css']
})
export class ProctoringDashboardComponent implements OnInit {
  testId: string = '';
  stats: Stats = {
    totalAttempts: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    autoSubmittedCount: 0,
    violationStats: {
      tabSwitches: 0,
      noFace: 0,
      multipleFaces: 0,
      devTools: 0,
      copyPaste: 0
    }
  };
  
  attempts: Attempt[] = [];
  filteredAttempts: Attempt[] = [];
  
  selectedRiskFilter = 'ALL';
  sortBy = 'suspicionScore';
  sortOrder = 'desc';
  
  loading = true;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}
  
  ngOnInit() {
    this.testId = this.route.snapshot.params['testId'];
    if (this.testId) {
      this.loadProctoringData();
    } else {
      this.error = 'No test ID provided';
      this.loading = false;
    }
  }
  
  async loadProctoringData() {
    this.loading = true;
    this.error = null;
    
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/admin/proctoring/overview/${this.testId}`
      ).toPromise();
      
      this.stats = response.stats;
      this.attempts = response.attempts;
      this.filteredAttempts = this.attempts;
      
      this.sortAttempts();
      this.loading = false;
      
    } catch (error: any) {
      console.error('Error loading proctoring data:', error);
      this.error = error.error?.message || 'Failed to load proctoring data';
      this.loading = false;
    }
  }
  
  filterByRisk(risk: string) {
    this.selectedRiskFilter = risk;
    
    if (risk === 'ALL') {
      this.filteredAttempts = this.attempts;
    } else {
      this.filteredAttempts = this.attempts.filter(a => a.riskLevel === risk);
    }
    
    this.sortAttempts();
  }
  
  sortAttempts() {
    this.filteredAttempts.sort((a, b) => {
      let aVal: any = a[this.sortBy as keyof Attempt];
      let bVal: any = b[this.sortBy as keyof Attempt];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (this.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }
  
  changeSortBy(field: string) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    
    this.sortAttempts();
  }
  
  getRiskColor(level: string): string {
    const colors: {[key: string]: string} = {
      'HIGH': '#F44336',
      'MEDIUM': '#FF9800',
      'LOW': '#4CAF50'
    };
    
    return colors[level] || '#999';
  }
  
  viewAttemptDetails(attemptId: string) {
    this.router.navigate(['/admin/proctoring/attempt', attemptId]);
  }
  
  exportToCSV() {
    const headers = ['Student', 'Email', 'Suspicion Score', 'Risk Level', 'Violations', 'Snapshots', 'Status'];
    const rows = this.filteredAttempts.map(a => [
      a.student.name,
      a.student.email,
      a.suspicionScore,
      a.riskLevel,
      a.violationCount,
      a.snapshotCount,
      a.autoSubmitted ? 'Auto-Submitted' : 'Completed'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proctoring-report-${this.testId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  refresh() {
    this.loadProctoringData();
  }
}
