import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = this.authService.token;

        // Add authorization header if token exists
        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        // Handle the request and catch errors
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // Handle 401 Unauthorized errors
                if (error.status === 401) {
                    // Don't logout if this is a login request that failed
                    const isLoginRequest = request.url.includes('/auth/login');

                    if (!isLoginRequest) {
                        console.error('Unauthorized access - logging out');
                        this.authService.logout(true);
                    }
                }

                // Handle 403 Forbidden errors
                if (error.status === 403) {
                    console.error('Access forbidden:', error.error?.message || 'You do not have permission to access this resource');
                }

                // Return the error to be handled by the component
                return throwError(() => error);
            })
        );
    }
}
