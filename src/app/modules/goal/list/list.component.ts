import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GoalService } from '../../../services/goal.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-goal-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.css']
})
export class GoalListComponent implements OnInit {
    goals: any[] = [];
    filteredGoals: any[] = [];
    loading = true;
    searchTerm = '';
    statusFilter = '';

    constructor(
        private goalService: GoalService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadGoals();
    }

    loadGoals(): void {
        this.loading = true;
        const params: any = {};

        if (this.statusFilter) {
            params.status = this.statusFilter;
        }

        this.goalService.getGoals().subscribe({
            next: (response) => {
                this.goals = response.goals || [];
                this.applyFilters();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading goals:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load goals'
                });
            }
        });
    }

    applyFilters(): void {
        this.filteredGoals = this.goals.filter(goal => {
            const matchesSearch = !this.searchTerm ||
                goal.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (goal.description && goal.description.toLowerCase().includes(this.searchTerm.toLowerCase()));

            const matchesStatus = !this.statusFilter || goal.status === this.statusFilter;

            return matchesSearch && matchesStatus;
        });
    }

    onSearch(): void {
        this.applyFilters();
    }

    onFilterChange(): void {
        this.loadGoals();
    }

    createGoal(): void {
        this.router.navigate(['/goal-management/create']);
    }

    viewGoal(id: string | undefined): void {
        if (!id) return;
        this.router.navigate([`/goal-management/${id}`]);
    }

    editGoal(id: string | undefined): void {
        if (!id) return;
        this.router.navigate([`/goal-management/${id}/edit`]);
    }

    deleteGoal(id: string | undefined): void {
        if (!id) return;
        const goal = this.goals.find(g => g._id === id);
        if (!goal) return;

        Swal.fire({
            title: 'Delete Goal?',
            html: `Are you sure you want to delete <strong>${goal.title}</strong>?<br><small>This will mark the goal as inactive.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.goalService.deleteGoal(id).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Goal has been marked as inactive.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadGoals();
                    },
                    error: (error) => {
                        console.error('Error deleting goal:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: error.error?.message || 'Failed to delete goal'
                        });
                    }
                });
            }
        });
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active': return 'status-active';
            case 'completed': return 'status-completed';
            case 'inactive': return 'status-inactive';
            default: return 'status-inactive';
        }
    }

    formatDate(date: any): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getGroupNames(groups: any[]): string {
        if (!groups || groups.length === 0) return 'No groups';
        return groups.map(g => g.name || g).join(', ');
    }

    // Permission checking methods
    hasPermission(permission: string): boolean {
        return this.authService.hasPermission(permission);
    }

    canCreateGoal(): boolean {
        return this.hasPermission('goals.create');
    }

    canUpdateGoal(): boolean {
        return this.hasPermission('goals.update');
    }

    canDeleteGoal(): boolean {
        return this.hasPermission('goals.delete');
    }
}
