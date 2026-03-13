import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Router, RouterLink } from '@angular/router';

@Component({
    selector: 'app-question-bank',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './question-bank.component.html'
})
export class QuestionBankComponent implements OnInit {
    questions: any[] = [];       // preview after upload (parsed from Excel)
    savedQuestions: any[] = [];  // questions already in DB
    isUploading = false;
    file: File | null = null;
    error = '';
    success = '';
    savedLoading = false;

    // ✅ Track selected testId to link questions on upload
    availableTests: any[] = [];
    selectedTestId = '';
    testsLoading = false;

    constructor(private api: ApiService, private router: Router) { }

    ngOnInit() {
        this.loadSavedQuestions();
        this.loadTests();
    }

    loadTests() {
        this.testsLoading = true;
        this.api.get('tests').subscribe({
            next: (data: any[]) => {
                this.availableTests = data || [];
                this.testsLoading = false;
            },
            error: () => this.testsLoading = false
        });
    }

    loadSavedQuestions() {
        this.savedLoading = true;
        this.api.get('tests/questions/all').subscribe({
            next: (data: any) => {
                this.savedQuestions = Array.isArray(data) ? data : [];
                this.savedLoading = false;
            },
            error: () => this.savedLoading = false
        });
    }

    onFileSelected(event: any) {
        this.file = event.target.files[0] || null;
        this.error = '';
        this.success = '';
        this.questions = [];
    }

    uploadFile() {
        if (!this.file) {
            this.error = 'Please select a file first.';
            return;
        }

        this.isUploading = true;
        this.error = '';
        this.success = '';

        const formData = new FormData();
        formData.append('file', this.file);

        // ✅ FIX: If a test is selected, include testId so questions auto-link
        if (this.selectedTestId) {
            formData.append('testId', this.selectedTestId);
        }

        this.api.postFile('tests/upload-questions', formData).subscribe({
            next: (data: any) => {
                this.isUploading = false;
                // ✅ FIX: backend returns { message, count, questionIds } not a questions array
                // Show success and refresh the saved list — no preview step needed
                this.success = data.message || `${data.count} questions uploaded successfully!`;
                this.file = null;
                this.questions = [];
                this.loadSavedQuestions();
            },
            error: (err: any) => {
                this.error = err.error?.message || 'Failed to upload file. Check the format and try again.';
                this.isUploading = false;
            }
        });
    }

    // ✅ FIX: wrap questions array in { questions: [...] } as backend expects
    saveQuestions() {
        if (this.questions.length === 0) return;
        this.isUploading = true;
        this.error = '';

        const payload: any = { questions: this.questions };
        if (this.selectedTestId) {
            payload.testId = this.selectedTestId;
        }

        this.api.post('tests/create-questions', payload).subscribe({
            next: (data: any) => {
                this.isUploading = false;
                this.success = `${data.count || this.questions.length} questions saved successfully!`;
                this.questions = [];
                this.file = null;
                this.loadSavedQuestions();
            },
            error: (err: any) => {
                this.error = err.error?.message || 'Failed to save questions.';
                this.isUploading = false;
            }
        });
    }

    deleteQuestion(q: any) {
        if (confirm(`Delete: "${q.text.substring(0, 60)}..."?`)) {
            this.api.delete(`tests/questions/${q._id}`).subscribe({
                next: () => {
                    this.savedQuestions = this.savedQuestions.filter(sq => sq._id !== q._id);
                    this.success = 'Question deleted.';
                    this.error = '';
                },
                error: () => this.error = 'Failed to delete question.'
            });
        }
    }

    deleteAllQuestions() {
        if (confirm(`DELETE ALL ${this.savedQuestions.length} QUESTIONS?\n\nThis cannot be undone!`)) {
            this.api.delete('tests/questions/all').subscribe({
                next: (data: any) => {
                    this.savedQuestions = [];
                    this.success = data.message || 'All questions deleted.';
                    this.error = '';
                },
                error: () => this.error = 'Failed to delete questions.'
            });
        }
    }

    downloadTemplate() {
        this.api.getBlob('admin/sample-template').subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'question_template.xlsx';
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: () => this.error = 'Failed to download template.'
        });
    }
}
