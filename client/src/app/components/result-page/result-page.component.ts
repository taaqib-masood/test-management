import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-result-page',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './result-page.component.html'
})
export class ResultPageComponent implements OnInit {
    loading = true;
    result: any = null;
    showResults = false;
    passed = false;
    percentage = 0;
    testTitle = '';

    private apiUrl = environment.apiUrl;

    constructor(private route: ActivatedRoute, private http: HttpClient) { }

    ngOnInit() {
        const attemptId = this.route.snapshot.paramMap.get('attemptId');
        if (attemptId) {
            this.http.get(`${this.apiUrl}/attempts/${attemptId}`).subscribe({
                next: (data: any) => {
                    this.result = data;
                    this.result.studentName = data.userId?.name || 'Student';

                    // ✅ FIX: showResults lives on the Test, not the Attempt
                    // attemptController.getAttempt populates test with 'title duration showResults'
                    // so data.test is a populated object, not just an ID
                    const test = data.test;
                    if (test && typeof test === 'object') {
                        this.showResults = test.showResults === true;
                        this.testTitle = test.title || '';
                    } else {
                        // test not populated — default to not showing results
                        this.showResults = false;
                        this.testTitle = '';
                    }

                    // ✅ FIX: attach testTitle to result so template can use result.testTitle
                    this.result.testTitle = this.testTitle;

                    this.loading = false;

                    if (this.showResults && data.score !== undefined) {
                        if (data.percentage != null) {
                            this.percentage = data.percentage;
                        } else {
                            const total = data.totalMarks || data.totalQuestions || 1;
                            this.percentage = Math.round((data.score / total) * 100);
                        }
                        this.passed = this.percentage >= 60;
                    }
                },
                error: () => {
                    this.loading = false;
                }
            });
        }
    }

    printCertificate() {
        const r = this.result;
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeMins = r.timeTaken ? Math.floor(r.timeTaken / 60) : 0;
        const timeSecs = r.timeTaken ? Math.round(r.timeTaken % 60) : 0;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Certificate - ${r.testTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family:'Outfit',sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc; }
                .cert { width:800px; padding:60px; background:#fff; border:3px solid #6366f1; border-radius:20px; position:relative; text-align:center; }
                .cert::before { content:''; position:absolute; inset:8px; border:1.5px solid #e0e7ff; border-radius:16px; pointer-events:none; }
                .header { font-size:14px; text-transform:uppercase; letter-spacing:0.15em; color:#64748b; margin-bottom:8px; }
                .title { font-size:36px; font-weight:800; background:linear-gradient(135deg,#6366f1,#a855f7,#ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:32px; }
                .line { width:60px; height:3px; background:linear-gradient(90deg,#6366f1,#ec4899); margin:0 auto 32px; border-radius:4px; }
                .name { font-size:28px; font-weight:700; color:#1e293b; margin-bottom:8px; }
                .detail { font-size:16px; color:#64748b; margin-bottom:6px; }
                .score-box { display:inline-block; margin:24px auto; padding:16px 40px; background:${this.passed ? '#f0fdf4' : '#fef2f2'}; border-radius:16px; border:2px solid ${this.passed ? '#bbf7d0' : '#fecaca'}; }
                .score-val { font-size:40px; font-weight:800; color:${this.passed ? '#16a34a' : '#dc2626'}; }
                .score-label { font-size:13px; color:#64748b; text-transform:uppercase; letter-spacing:0.1em; }
                .status { font-size:18px; font-weight:700; color:${this.passed ? '#16a34a' : '#dc2626'}; margin-top:16px; }
                .footer { margin-top:40px; font-size:12px; color:#94a3b8; }
                .seal { font-size:48px; margin-top:16px; }
                @media print { body { background:#fff; } .cert { border:3px solid #6366f1; box-shadow:none; } }
            </style>
        </head>
        <body>
            <div class="cert">
                <p class="header">Certificate of Completion</p>
                <h1 class="title">LTTS Test Portal</h1>
                <div class="line"></div>
                <p class="detail">This is to certify that</p>
                <h2 class="name">${r.studentName}</h2>
                <p class="detail">has completed the assessment</p>
                <p style="font-size:20px; font-weight:700; color:#1e293b; margin:12px 0 4px;">"${r.testTitle}"</p>
                <p class="detail">on ${date}</p>
                <div class="score-box">
                    <div class="score-val">${this.percentage}%</div>
                    <div class="score-label">Score: ${r.score} / ${r.totalMarks || 0} • Time: ${timeMins}m ${timeSecs}s</div>
                </div>
                <p class="status">${this.passed ? '✓ PASSED' : '✗ NEEDS IMPROVEMENT'}</p>
                <div class="seal">${this.passed ? '🏆' : '📋'}</div>
                <p class="footer">Generated by LTTS Test Portal • This is a computer-generated certificate</p>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    }
}
