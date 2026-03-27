import { Injectable } from '@angular/core';
import * as faceapi from 'face-api.js';

@Injectable({
  providedIn: 'root'
})
export class FaceDetectionService {
  private modelsLoaded = false;
  
  constructor() {}
  
  /**
   * Load face detection models from assets folder
   * Must be called before using detectFaces()
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) {
      console.log('Models already loaded');
      return;
    }
    
    try {
      const MODEL_URL = '/assets/models';
      
      console.log('Loading face detection models...');
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
      ]);
      
      this.modelsLoaded = true;
      console.log('✓ Face detection models loaded successfully');
      
    } catch (error) {
      console.error('Error loading face detection models:', error);
      throw new Error('Failed to load face detection models. Please check that model files are in /assets/models/');
    }
  }
  
  /**
   * Detect faces in video element
   * @param videoElement - HTML video element with active stream
   * @returns Number of faces detected
   */
  async detectFaces(videoElement: HTMLVideoElement): Promise<number> {
    if (!this.modelsLoaded) {
      throw new Error('Models not loaded. Call loadModels() first.');
    }
    
    if (!videoElement || videoElement.readyState < 2) {
      console.warn('Video element not ready');
      return 0;
    }
    
    try {
      const detections = await faceapi
        .detectAllFaces(
          videoElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks();
      
      return detections.length;
      
    } catch (error) {
      console.error('Error detecting faces:', error);
      return 0;
    }
  }
  
  /**
   * Check if models are loaded
   */
  isModelsLoaded(): boolean {
    return this.modelsLoaded;
  }
  
  /**
   * Get detailed face detection info (optional - for advanced use)
   */
  async getDetailedDetection(videoElement: HTMLVideoElement): Promise<any> {
    if (!this.modelsLoaded) {
      throw new Error('Models not loaded');
    }
    
    try {
      const detections = await faceapi
        .detectAllFaces(
          videoElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks();
      
      return {
        faceCount: detections.length,
        detections: detections.map(d => ({
          score: d.detection.score,
          box: d.detection.box
        }))
      };
      
    } catch (error) {
      console.error('Error in detailed detection:', error);
      return { faceCount: 0, detections: [] };
    }
  }
}
