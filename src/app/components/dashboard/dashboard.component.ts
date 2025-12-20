import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, DashboardData } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    dashboardData: DashboardData | null = null;
    loading = true;
    error: string | null = null;

    constructor(
        private dashboardService: DashboardService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.loading = true;
        this.error = null;

        this.dashboardService.getDashboardData().subscribe({
            next: (data) => {
                this.dashboardData = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Failed to load dashboard data';
                this.loading = false;
                console.error('Dashboard error:', err);
            }
        });
    }

    getCurrentUserRole(): string {
        const user = this.authService.currentUserValue;
        // Return role label if available, otherwise role name
        if (typeof user?.role === 'object') {
            return user.role.label || user.role.name || 'User';
        }
        return user?.role || 'User';
    }

    getStatValue(stats: any, key: string): number {
        return stats?.[key] || 0;
    }
}
