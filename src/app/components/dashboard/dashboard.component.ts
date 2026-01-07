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
        if (typeof user?.role === 'object') {
            return user.role.label || user.role.name || 'User';
        }
        return user?.role || 'User';
    }

    getStatValue(stats: any, key: string): number {
        return stats?.[key] || 0;
    }

    getGoalTotal(goal: any): number {
        if (!goal?.stages) return 0;
        return goal.stages.reduce((acc: number, stage: any) => acc + (stage.count || 0), 0);
    }

    getMemberLeadsAtStage(member: any, status: string): any[] {
        if (!member?.stages) return [];
        const stage = member.stages.find((s: any) => s.status === status);
        return stage?.leads || [];
    }

    getMemberTotal(member: any): number {
        if (!member?.stages) return 0;
        return member.stages.reduce((acc: number, stage: any) => acc + (stage.count || 0), 0);
    }

    getGoalStages(goal: any): string[] {
        if (!goal?.stages) return [];
        return goal.stages.map((s: any) => s.status);
    }
}
