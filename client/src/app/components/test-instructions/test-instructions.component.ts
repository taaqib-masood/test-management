import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-test-instructions',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './test-instructions.component.html',
    styleUrls: ['./test-instructions.css']
})
export class TestInstructionsComponent implements OnInit {
    testInfo: any = null;
    loading = true;
    error = '';
    link = '';
    attemptId = '';

    agreedToRules = false;
    webcamChecked = false;
    webcamChecking = false;
    webcamError = '';

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

    get maxTabSwitches(): number {
        return this.testInfo?.antiCheating?.maxTabSwitches ?? this.testInfo?.tabSwitchLimit ?? 3;
    }

    checkWebcam() {
        this.webcamChecking = true;
        this.webcamError = '';
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                stream.getTracks().forEach(t => t.stop());
                this.webcamChecked = true;
                this.webcamChecking = false;
            })
            .catch(() => {
                this.webcamError = 'Webcam access denied. Please allow camera access and try again.';
                this.webcamChecking = false;
            });
    }

    startTest() {
        if (!this.agreedToRules || !this.webcamChecked) return;
        this.router.navigate(['/test', this.link, 'take'], {
            queryParams: { attemptId: this.attemptId }
        });
    }
}
