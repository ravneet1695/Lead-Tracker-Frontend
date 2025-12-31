import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { GoalEntryService } from '../../../services/goal-entry.service';
import { AuthService } from '../../../services/auth.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import Swal from 'sweetalert2';

interface GoalGroup {
    goal: {
        _id: string;
        title: string;
        target?: number;
        targetField?: string;
    };
    leads: any[];
    stats: {
        total: number;
        completed: number;
        inProgress: number;
        percentage: number;
        totalValue?: number;
        targetValue?: number;
    };
    expanded: boolean;
}

@Component({
    selector: 'app-my-leads',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './my-leads.component.html',
    styleUrls: ['./my-leads.component.css'],
    animations: [
        trigger('slideDown', [
            state('void', style({
                height: '0',
                opacity: '0',
                overflow: 'hidden'
            })),
            transition(':enter', [
                animate('300ms ease-out', style({
                    height: '*',
                    opacity: '1'
                }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({
                    height: '0',
                    opacity: '0'
                }))
            ])
        ])
    ]
})
export class MyLeadsComponent implements OnInit {
    leads: any[] = [];
    goalGroups: GoalGroup[] = [];
    filteredGoalGroups: GoalGroup[] = [];
    loading = true;

    // Filter properties
    searchTerm: string = '';
    goalFilter: string = 'all';
    statusFilter: string = '';

    totalStats = {
        totalGoals: 0,
        totalLeads: 0,
        completedLeads: 0,
        overallPercentage: 0
    };

    constructor(
        private goalEntryService: GoalEntryService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadLeads();
    }

    loadLeads(): void {
        this.loading = true;
        this.goalEntryService.getEntries().subscribe({
            next: (response) => {
                this.leads = response.entries || [];
                this.goalGroups = this.groupLeadsByGoal(this.leads);
                this.calculateTotalStats();
                this.applyFilters();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading leads:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load leads'
                });
            }
        });
    }

    groupLeadsByGoal(leads: any[]): GoalGroup[] {
        const grouped = new Map<string, GoalGroup>();

        leads.forEach(lead => {
            const goalId = lead.goal?._id;
            if (!goalId) return;

            if (!grouped.has(goalId)) {
                grouped.set(goalId, {
                    goal: {
                        _id: lead.goal._id,
                        title: lead.goal.title || 'Untitled Goal',
                        target: lead.goal.target,
                        targetField: lead.goal.targetField
                    },
                    leads: [],
                    stats: {
                        total: 0,
                        completed: 0,
                        inProgress: 0,
                        percentage: 0,
                        totalValue: 0,
                        targetValue: lead.goal.target
                    },
                    expanded: false
                });
            }

            const group = grouped.get(goalId)!;
            group.leads.push(lead);
            group.stats.total++;

            // Count by status
            const status = lead.status?.toLowerCase() || '';
            if (status.includes('complet')) {
                group.stats.completed++;
            } else if (status.includes('progress') || status.includes('working')) {
                group.stats.inProgress++;
            }

            // Sum values for revenue-based goals
            if (lead.goal.targetField && lead.formData) {
                const value = parseFloat(lead.formData[lead.goal.targetField] || 0);
                group.stats.totalValue = (group.stats.totalValue || 0) + value;
            }
        });

        // Calculate percentages and set first accordion as expanded
        const groups = Array.from(grouped.values());
        groups.forEach((group, index) => {
            if (group.stats.targetValue && group.stats.totalValue !== undefined) {
                // Revenue-based calculation
                group.stats.percentage = Math.min((group.stats.totalValue / group.stats.targetValue) * 100, 100);
            } else {
                // Lead count-based calculation
                group.stats.percentage = group.stats.total > 0
                    ? (group.stats.completed / group.stats.total) * 100
                    : 0;
            }

            // Expand first accordion by default
            if (index === 0) {
                group.expanded = true;
            }
        });

        // Sort by percentage (descending) - active goals first
        return groups.sort((a, b) => {
            if (a.stats.percentage === 100 && b.stats.percentage !== 100) return 1;
            if (a.stats.percentage !== 100 && b.stats.percentage === 100) return -1;
            return b.stats.percentage - a.stats.percentage;
        });
    }

    calculateTotalStats(): void {
        this.totalStats.totalGoals = this.goalGroups.length;
        this.totalStats.totalLeads = this.leads.length;
        this.totalStats.completedLeads = this.leads.filter(lead =>
            lead.status?.toLowerCase().includes('complet')
        ).length;
        this.totalStats.overallPercentage = this.totalStats.totalLeads > 0
            ? (this.totalStats.completedLeads / this.totalStats.totalLeads) * 100
            : 0;
    }

    applyFilters(): void {
        let filtered = [...this.goalGroups];

        // Filter by goal
        if (this.goalFilter && this.goalFilter !== 'all') {
            filtered = filtered.filter(g => g.goal._id === this.goalFilter);
        }

        // Filter by search term or status
        if (this.searchTerm || this.statusFilter) {
            filtered = filtered.map(goalGroup => {
                const filteredLeads = goalGroup.leads.filter(lead => {
                    const matchesSearch = !this.searchTerm ||
                        lead.groups?.some((g: any) => g.name?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
                        lead.remarks?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                        lead.status?.toLowerCase().includes(this.searchTerm.toLowerCase());

                    const matchesStatus = !this.statusFilter ||
                        lead.status?.toLowerCase() === this.statusFilter.toLowerCase();

                    return matchesSearch && matchesStatus;
                });

                return {
                    ...goalGroup,
                    leads: filteredLeads
                };
            }).filter(g => g.leads.length > 0);
        }

        this.filteredGoalGroups = filtered;
    }

    clearFilters(): void {
        this.searchTerm = '';
        this.goalFilter = 'all';
        this.statusFilter = '';
        this.applyFilters();
    }

    hasActiveFilters(): boolean {
        return this.searchTerm !== '' || this.goalFilter !== 'all' || this.statusFilter !== '';
    }

    toggleAccordion(goalGroup: GoalGroup): void {
        // If clicking on an already expanded accordion, just collapse it
        if (goalGroup.expanded) {
            goalGroup.expanded = false;
        } else {
            // Close all other accordions and open this one
            this.filteredGoalGroups.forEach(g => g.expanded = false);
            goalGroup.expanded = true;
        }
    }

    editLead(entryId: string): void {
        this.router.navigate(['/leads/edit', entryId]);
    }

    deleteLead(entryId: string, goalGroup: GoalGroup): void {
        Swal.fire({
            title: 'Delete Lead?',
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it'
        }).then((result) => {
            if (result.isConfirmed) {
                this.goalEntryService.deleteEntry(entryId).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Lead has been deleted',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadLeads();
                    },
                    error: (error) => {
                        console.error('Error deleting lead:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: error.error?.message || 'Failed to delete lead'
                        });
                    }
                });
            }
        });
    }

    createLead(goalId: string): void {
        this.router.navigate(['/leads/create', goalId]);
    }

    formatDate(date: any): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getStatusClass(status: string): string {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower.includes('complet')) return 'completed';
        if (statusLower.includes('progress') || statusLower.includes('working')) return 'in-progress';
        if (statusLower.includes('cancel') || statusLower.includes('reject')) return 'cancelled';
        return 'new';
    }

    getProgressClass(percentage: number): string {
        if (percentage >= 100) return 'complete';
        if (percentage >= 70) return 'high';
        if (percentage >= 30) return 'medium';
        return 'low';
    }

    goBack(): void {
        this.router.navigate(['/goals']);
    }

    logout(): void {
        this.authService.logout();
    }
}
