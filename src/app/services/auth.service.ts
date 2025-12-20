import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
    id: string;
    name: string;
    email: string;
    role: {
        _id: string;
        name: string;
        label: string;
        permissions?: string[];  // Added for permission checking
    };
    organization?: {
        _id: string;
        name: string;
        logo?: string;
    };
    groups: string[];
}

export interface AuthResponse {
    success: boolean;
    token: string;
    user: User;
}

interface JWTPayload {
    id: string;
    exp: number;
    iat: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject: BehaviorSubject<User | null>;
    public currentUser: Observable<User | null>;
    private tokenKey = 'auth_token';

    constructor(
        private http: HttpClient,
        private router: Router
    ) {
        const storedUser = localStorage.getItem('current_user');
        this.currentUserSubject = new BehaviorSubject<User | null>(
            storedUser ? JSON.parse(storedUser) : null
        );
        this.currentUser = this.currentUserSubject.asObservable();

        // Check token expiration on service initialization
        this.checkTokenExpiration();
    }

    public get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    public get token(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
            .pipe(
                tap(response => {
                    if (response.success && response.token) {
                        localStorage.setItem(this.tokenKey, response.token);
                        localStorage.setItem('current_user', JSON.stringify(response.user));
                        this.currentUserSubject.next(response.user);
                    }
                })
            );
    }

    logout(showMessage: boolean = false): void {
        // Call backend logout endpoint for audit trail
        const token = this.token;
        if (token) {
            this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
                next: () => console.log('Logout recorded'),
                error: (err) => console.error('Logout error:', err)
            });
        }

        // Clear local storage and state
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem('current_user');
        this.currentUserSubject.next(null);

        // Navigate to login
        this.router.navigate(['/login'], {
            queryParams: showMessage ? { message: 'session_expired' } : {}
        });
    }

    isLoggedIn(): boolean {
        const token = this.token;
        if (!token) return false;

        // Check if token is expired
        if (this.isTokenExpired()) {
            this.logout(true);
            return false;
        }

        return true;
    }

    isTokenExpired(): boolean {
        const token = this.token;
        if (!token) return true;

        try {
            const payload = this.decodeToken(token);
            if (!payload || !payload.exp) return true;

            // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
            const expirationTime = payload.exp * 1000;
            return Date.now() >= expirationTime;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    }

    getTokenExpirationTime(): Date | null {
        const token = this.token;
        if (!token) return null;

        try {
            const payload = this.decodeToken(token);
            if (!payload || !payload.exp) return null;
            return new Date(payload.exp * 1000);
        } catch (error) {
            return null;
        }
    }

    private decodeToken(token: string): JWTPayload | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const payload = parts[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    private checkTokenExpiration(): void {
        if (this.isTokenExpired()) {
            this.logout(true);
        }
    }

    isAdmin(): boolean {
        const roleName = this.currentUserValue?.role?.name;
        return roleName === 'super_admin' || roleName === 'org_admin';
    }

    isManager(): boolean {
        return this.currentUserValue?.role?.name === 'manager';
    }

    isSales(): boolean {
        return this.currentUserValue?.role?.name === 'sales';
    }

    // Permission-based checking methods (NEW)
    hasPermission(permission: string): boolean {
        const user = this.currentUserValue;
        if (!user || !user.role) return false;

        const permissions = user.role.permissions || [];

        // Check for wildcard permission (grants all access)
        if (permissions.includes('*')) return true;

        // Check for specific permission
        return permissions.includes(permission);
    }

    hasAllPermissions(permissions: string[]): boolean {
        return permissions.every(p => this.hasPermission(p));
    }

    hasAnyPermission(permissions: string[]): boolean {
        return permissions.some(p => this.hasPermission(p));
    }
}
