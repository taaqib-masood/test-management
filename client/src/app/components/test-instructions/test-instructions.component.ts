import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-test-instructions',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './test-instructions.component.html'
})
export class TestInstructionsComponent implements OnInit {
    testInfo: any = null;
    loading = true;
    error = '';
    link = '';
    attemptId = '';

    private apiUrl = environment.apiUrl;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.link = this.route.snapshot.paramMap.get('link') || '';
        this.attemptId = this.route.snapshot.queryParamMap.get('attemptId') || '';

        if (!this.attemptId) {
            // No attempt started — go back to entry
            this.router.navigate(['/test', this.link]);
            return;
        }

        this.loadTestInfo();
    }

    loadTestInfo() {
        this.http.get(`${this.apiUrl}/tests/link/${this.link}`).subscribe({
            next: (test: any) => {
                this.testInfo = test;
                this.loading = false;
            },
            error: (err) => {
                this.error = err.error?.message || 'Failed to load test';
                this.loading = false;
            }
        });
    }

    startTest() {
        this.router.navigate(['/test', this.link, 'take'], {
            queryParams: { attemptId: this.attemptId }
        });
    }
}
