import { Component, HostListener, Inject, PLATFORM_ID, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-cursor',
  standalone: true,
  template: `
    <div class="cursor-dot" [style.left.px]="cursorX" [style.top.px]="cursorY"></div>
    <div class="cursor-outline" [style.left.px]="outlineX" [style.top.px]="outlineY"></div>
  `,
  styles: [`
    .cursor-dot {
      width: 8px;
      height: 8px;
      background-color: #4f46e5;
      border-radius: 50%;
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
    }
    .cursor-outline {
      width: 40px;
      height: 40px;
      border: 2px solid rgba(79, 70, 229, 0.5);
      border-radius: 50%;
      position: fixed;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      transition: width 0.2s, height 0.2s, background-color 0.2s;
    }
  `]
})
export class CursorComponent implements OnInit, OnDestroy {
  cursorX = 0;
  cursorY = 0;
  outlineX = 0;
  outlineY = 0;
  private animationId: number | null = null;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.animate();
    }
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (this.isBrowser) {
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
    }
  }

  animate() {
    if (!this.isBrowser) return;

    const distX = this.cursorX - this.outlineX;
    const distY = this.cursorY - this.outlineY;

    this.outlineX += distX * 0.15;
    this.outlineY += distY * 0.15;

    this.animationId = requestAnimationFrame(() => this.animate());
  }
}
