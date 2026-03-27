import { ApplicationConfig } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { LoginComponent } from './components/login/login.component';
import { TestEngineComponent } from './components/test-engine/test-engine.component';
import { ProctoringDashboardComponent } from './components/admin-dashboard/proctoring-dashboard/proctoring-dashboard.component';

const routes: Routes = [
  { path: '',                          redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',                     component: LoginComponent },
  { path: 'test/:link',                component: TestEngineComponent },
  { path: 'admin/proctoring/:testId',  component: ProctoringDashboardComponent },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
  ]
};
