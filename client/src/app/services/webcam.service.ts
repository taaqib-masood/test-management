import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebcamService {
  private stream: MediaStream | null = null;
  
  constructor(private http: HttpClient) {}
  
  /**
   * Start webcam and return media stream
   * @returns MediaStream from webcam
   */
  async startWebcam(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('✓ Webcam started successfully');
      return this.stream;
      
    } catch (error: any) {
      console.error('Error accessing webcam:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera found. Please connect a camera and try again.');
      } else {
        throw new Error('Could not access webcam. Please check your camera and permissions.');
      }
    }
  }
  
  /**
   * Stop webcam and release resources
   */
  stopWebcam(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('✓ Camera track stopped');
      });
      this.stream = null;
    }
  }
  
  /**
   * Capture snapshot from video element
   * @param videoElement - HTML video element with active stream
   * @returns Blob containing JPEG image
   */
  async captureSnapshot(videoElement: HTMLVideoElement): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(videoElement, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not create blob from canvas'));
          }
        }, 'image/jpeg', 0.8);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Upload snapshot to backend
   * @param attemptId - Attempt ID
   * @param blob - Image blob
   * @param facesDetected - Number of faces detected
   * @param eventType - Type of event (PERIODIC, TAB_SWITCH, etc.)
   */
  async uploadSnapshot(
    attemptId: string,
    blob: Blob,
    facesDetected: number,
    eventType: string = 'PERIODIC'
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('image', blob, 'snapshot.jpg');
      formData.append('eventType', eventType);
      formData.append('facesDetected', facesDetected.toString());
      
      const response = await this.http.post(
        `${environment.apiUrl}/proctoring/snapshot/${attemptId}`,
        formData
      ).toPromise();
      
      console.log('✓ Snapshot uploaded:', eventType);
      return response;
      
    } catch (error) {
      console.error('Error uploading snapshot:', error);
      throw error;
    }
  }
  
  /**
   * Upload reference image (captured at test start)
   * @param attemptId - Attempt ID
   * @param blob - Image blob
   */
  async uploadReferenceImage(attemptId: string, blob: Blob): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('image', blob, 'reference.jpg');
      
      const response = await this.http.post(
        `${environment.apiUrl}/proctoring/reference/${attemptId}`,
        formData
      ).toPromise();
      
      console.log('✓ Reference image uploaded');
      return response;
      
    } catch (error) {
      console.error('Error uploading reference image:', error);
      throw error;
    }
  }
  
  /**
   * Check if webcam is currently active
   */
  isWebcamActive(): boolean {
    return this.stream !== null && this.stream.active;
  }
  
  /**
   * Get current stream
   */
  getStream(): MediaStream | null {
    return this.stream;
  }
}
