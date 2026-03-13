import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    email = '';
    password = '';
    error = '';
    isLoading = false;

    constructor(private authService: AuthService, private router: Router) {
        const user = this.authService.getUser();
        // ✅ FIX: role is nested inside user.user.role because backend returns { token, user: {...} }
        const role = user?.user?.role || user?.role;
        if (user && role === 'admin') {
            this.router.navigate(['/admin']);
        }
    }

    onSubmit() {
        this.error = '';
        this.isLoading = true;

        this.authService.login({ email: this.email, password: this.password }).subscribe({
            next: (response: any) => {
                this.isLoading = false;
                // ✅ FIX: backend returns { token, user: { role, name, email } }
                // so role is at response.user.role, not response.role
                const role = response?.user?.role || response?.role;
                if (role === 'admin') {
                    this.router.navigate(['/admin']);
                } else {
                    this.error = 'Only admin accounts can log in here.';
                    this.authService.logout();
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                this.error = err.error?.message || 'Invalid credentials';
            }
        });
    }
}
