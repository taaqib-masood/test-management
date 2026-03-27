import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { Router } from '@angular/router';

@Component({
    selector: 'app-student-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule], // Add FormsModule
    templateUrl: './student-dashboard.component.html'
})
export class StudentDashboardComponent implements OnInit {
    user: any;
    testLink: string = '';
    attempts: any[] = [];
    constructor(private auth: AuthService, private api: ApiService, private router: Router) {
        this.user = this.auth.getUser();
    }

    ngOnInit() {
    }

    navigateToTest() {
        if (this.testLink) {
            this.router.navigate(['/test', this.testLink]);
        }
    }

    logout() {
        this.auth.logout();
    }
}
