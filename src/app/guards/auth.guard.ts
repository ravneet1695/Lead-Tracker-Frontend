import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot): boolean {
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/login']);
            return false;
        }

        // Check permissions (permission-based access control)
        const requiredPermissions = route.data['permissions'] as string[];
        if (requiredPermissions && requiredPermissions.length > 0) {
            const hasPermissions = this.authService.hasAllPermissions(requiredPermissions);
            if (!hasPermissions) {
                console.warn('Access denied: Missing required permissions', requiredPermissions);
                this.router.navigate(['/dashboard']);
                return false;
            }
        }

        // No permission restrictions - allow access
        return true;
    }
}
