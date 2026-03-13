import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/auth`;
    private currentUserSubject = new BehaviorSubject<any>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                this.currentUserSubject.next(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
    }

    login(credentials: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
            tap((response: any) => {
                localStorage.setItem('user', JSON.stringify(response));
                this.currentUserSubject.next(response);
            })
        );
    }

    register(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/register`, data).pipe(
            tap((response: any) => {
                localStorage.setItem('user', JSON.stringify(response));
                this.currentUserSubject.next(response);
            })
        );
    }

    logout() {
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    // ✅ FIX: backend returns { token, user: { role, name, email } }
    // token is at the top level, user details are nested under .user
    getToken(): string | null {
        const response = this.currentUserSubject.value;
        return response?.token || null;
    }

    // ✅ FIX: return the nested user object so role/name/email are accessible directly
    getUser(): any {
        const response = this.currentUserSubject.value;
        if (!response) return null;
        // If already flattened (old format), return as-is
        // If nested (new format { token, user: {...} }), return the inner user with token attached
        if (response.user) {
            return { ...response.user, token: response.token };
        }
        return response;
    }
}
