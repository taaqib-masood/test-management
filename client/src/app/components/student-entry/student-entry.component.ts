import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-student-entry',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './student-entry.component.html',
    styleUrls: []
})
export class StudentEntryComponent implements OnInit {
    testLink = '';
    studentName = '';
    studentEmail = '';
    accessCode = '';
    error = '';
    isLoading = false;
    testLoading = true;
    testInfo: any = null;

    private apiUrl = environment.apiUrl;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.testLink = this.route.snapshot.paramMap.get('link') || '';
        this.loadTestInfo();
    }

    loadTestInfo() {
        this.testLoading = true;
        this.error = '';
        this.http.get(`${this.apiUrl}/tests/link/${this.testLink}`).subscribe({
            next: (test: any) => {
                this.testInfo = test;
                this.testLoading = false;
            },
            error: (err: any) => {
                this.error = err.error?.message || 'Test not found or no longer active';
                this.testLoading = false;
            }
        });
    }

    onSubmit() {
        if (!this.studentName.trim() || !this.studentEmail.trim()) {
            this.error = 'Please enter your name and email';
            return;
        }

        const email = this.studentEmail.trim().toLowerCase();
        if (!email.endsWith('@ltts.com')) {
            this.error = 'Only @ltts.com email addresses are allowed';
            return;
        }

        // ✅ FIX: backend returns 'requiresAccessCode', not 'hasAccessCode'
        if (this.testInfo.requiresAccessCode && !this.accessCode.trim()) {
            this.error = 'Access code is required for this test';
            return;
        }

        this.error = '';
        this.isLoading = true;

        const payload: any = {
            testId: this.testInfo._id,
            studentName: this.studentName.trim(),
            studentEmail: email
        };

        // ✅ FIX: use requiresAccessCode consistently
        if (this.testInfo.requiresAccessCode) {
            payload.accessCode = this.accessCode.trim();
        }

        this.http.post(`${this.apiUrl}/attempts/start`, payload).subscribe({
            next: (attempt: any) => {
                this.isLoading = false;
                // Navigate to instructions page (or directly to take if no instructions)
                this.router.navigate(['/test', this.testLink, 'instructions'], {
                    queryParams: { attemptId: attempt._id }
                });
            },
            error: (err: any) => {
                this.isLoading = false;
                this.error = err.error?.message || 'Failed to register. Please try again.';
            }
        });
    }
}
