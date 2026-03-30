import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class TestInstructionsComponent implements OnInit, OnDestroy {
    testInfo: any = null;
    loading = true;
    error = '';
    link = '';
    attemptId = '';

    // Webcam check
    agreedToRules = false;
    webcamChecked = false;
    webcamChecking = false;
    webcamError = '';

    // Mic check
    micChecked = false;
    micChecking = false;
    micError = '';
    micVolume = 0;
    micStreamActive = false;
    private micStream: MediaStream | null = null;
    private micAnalyser: AnalyserNode | null = null;
    private micAudioCtx: AudioContext | null = null;
    private micVolumeInterval: any = null;

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

    ngOnDestroy() {
        this.stopMicCheck();
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

    checkMic() {
        this.micChecking = true;
        this.micError = '';
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                this.micStream = stream;
                this.micStreamActive = true;
                this.micAudioCtx = new AudioContext();
                const source = this.micAudioCtx.createMediaStreamSource(stream);
                this.micAnalyser = this.micAudioCtx.createAnalyser();
                this.micAnalyser.fftSize = 256;
                source.connect(this.micAnalyser);

                const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
                this.micVolumeInterval = setInterval(() => {
                    if (!this.micAnalyser) return;
                    this.micAnalyser.getByteFrequencyData(data);
                    const rms = data.reduce((s, v) => s + v, 0) / data.length;
                    this.micVolume = Math.min(100, Math.round((rms / 128) * 100));
                    if (rms > 10 && !this.micChecked) {
                        this.micChecked = true;
                    }
                }, 100);

                this.micChecking = false;
            })
            .catch(() => {
                this.micError = 'Microphone access denied. Please allow mic access and try again.';
                this.micChecking = false;
            });
    }

    private stopMicCheck() {
        clearInterval(this.micVolumeInterval);
        this.micStream?.getTracks().forEach(t => t.stop());
        this.micAudioCtx?.close();
        this.micStream = null;
        this.micAudioCtx = null;
        this.micAnalyser = null;
        this.micStreamActive = false;
    }

    startTest() {
        if (!this.agreedToRules || !this.webcamChecked || !this.micChecked) return;
        this.stopMicCheck(); // release mic so test-engine can re-acquire it
        this.router.navigate(['/test', this.link, 'take'], {
            queryParams: { attemptId: this.attemptId }
        });
    }
}
