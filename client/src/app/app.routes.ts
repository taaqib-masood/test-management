import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { QuestionBankComponent } from './components/question-bank/question-bank.component';
import { CreateTestComponent } from './components/create-test/create-test.component';
import { StudentEntryComponent } from './components/student-entry/student-entry.component';
import { TestInstructionsComponent } from './components/test-instructions/test-instructions.component';
import { TestEngineComponent } from './components/test-engine/test-engine.component';
import { ResultPageComponent } from './components/result-page/result-page.component';
import { TestResultsComponent } from './components/test-results/test-results.component';
import { AnalyticsDashboardComponent } from './components/analytics-dashboards/analytics-dashboard.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'admin', component: AdminDashboardComponent },
    { path: 'admin/question-bank', component: QuestionBankComponent },
    { path: 'admin/create-test', component: CreateTestComponent },
    { path: 'admin/test/:id/results', component: TestResultsComponent },
    { path: 'admin/analytics', component: AnalyticsDashboardComponent },
    { path: 'test/:link', component: StudentEntryComponent },
    { path: 'test/:link/instructions', component: TestInstructionsComponent },
    { path: 'test/:link/take', component: TestEngineComponent },
    { path: 'result/:attemptId', component: ResultPageComponent },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }
];
