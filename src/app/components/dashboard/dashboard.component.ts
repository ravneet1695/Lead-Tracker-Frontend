import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, DashboardData } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    dashboardData: DashboardData | null = null;
    originalGoalData: any[] = []; // Store original unfiltered data
    filteredGoalData: any[] = []; // Computed filtered data
    loading = true;
    error: string | null = null;

    // Filter properties
    selectedOrganization: string = ''; // Organization filter
    selectedGoals: string[] = [];
    startDate: string = '';
    endDate: string = '';
    goalStatusFilter: string = ''; // Goal status (active, closed, etc.)
    leadStatusFilter: string = ''; // Lead entry status
    goalDropdownOpen: boolean = false;

    // Available options for dropdowns
    availableOrganizations: any[] = [];
    availableGoals: any[] = []; // All goals
    filteredAvailableGoals: any[] = []; // Goals filtered by organization
    availableGoalStatuses: string[] = ['active', 'inactive', 'closed', 'upcoming'];
    availableLeadStatuses: string[] = [];

    private searchDebounceTimer: any;

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

        // Load all data without filters (only once)
        this.dashboardService.getDashboardData().subscribe({
            next: (data) => {
                console.log('Dashboard data received:', data);
                this.dashboardData = data;
                this.originalGoalData = data.goalStagesSummary || [];
                console.log('originalGoalData set to:', this.originalGoalData);
                this.loadAvailableGoals(); // Update available goals and statuses
                this.applyClientSideFilters(); // Apply filters to the loaded data
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Failed to load dashboard data';
                this.loading = false;
                console.error('Dashboard error:', err);
            }
        });
    }

    /**
     * Load all available goals and organizations from dashboard data
     * Extracts unique organizations and all goals, then applies initial filtering
     */
    loadAvailableGoals(): void {
        console.log('🔍 [loadAvailableGoals] Data:', this.originalGoalData);

        if (!this.originalGoalData || !Array.isArray(this.originalGoalData) || this.originalGoalData.length === 0) {
            console.warn('⚠️ No valid goal data available');
            this.availableGoals = [];
            this.filteredAvailableGoals = [];
            this.availableOrganizations = [];
            return;
        }

        // Extract unique organizations
        const orgMap = new Map<string, any>();
        this.originalGoalData.forEach((goal: any) => {
            if (goal && goal.organization) {
                const org = goal.organization;
                const orgId = typeof org === 'object' ? org._id : org;
                const orgName = typeof org === 'object' ? org.name : 'Unknown';
                if (orgId && !orgMap.has(orgId)) {
                    orgMap.set(orgId, { id: orgId, name: orgName });
                }
            }
        });
        this.availableOrganizations = Array.from(orgMap.values());

        // Extract all goals with extreme validation
        this.availableGoals = this.originalGoalData
            .map((g: any) => {
                if (!g) return null;
                return {
                    id: g.goalId || g._id, // Fallback to _id if goalId is missing
                    title: g.goalTitle || g.title || 'Untitled Goal',
                    organization: g.organization,
                    status: g.status || 'active'
                };
            })
            .filter((g: any) => g !== null && g.id); // Must have an ID

        console.log(`✅ Available Goals mapped (${this.availableGoals.length}):`, this.availableGoals);

        // Apply filtering and update statuses
        this.updateFilteredGoals();
        this.updateAvailableStatuses();
    }

    /**
     * Update filtered goals based on organization selection
     * DEFAULT: No organization selected → Show ALL goals
     * FILTERED: Organization selected → Show only that org's goals
     */
    updateFilteredGoals(): void {
        if (!this.selectedOrganization) {
            // DEFAULT: Show all goals from all organizations
            this.filteredAvailableGoals = [...this.availableGoals];
            console.log(`🎯 Showing all ${this.filteredAvailableGoals.length} goals`);
        } else {
            // FILTERED: Show only goals from selected organization
            this.filteredAvailableGoals = this.availableGoals.filter(goal => {
                if (!goal?.organization) return false;
                const goalOrgId = typeof goal.organization === 'object'
                    ? goal.organization._id
                    : goal.organization;
                return goalOrgId === this.selectedOrganization;
            });
            console.log(`🎯 Filtered to ${this.filteredAvailableGoals.length} goals for selected org`);
        }
    }

    updateAvailableStatuses(): void {
        // Extract statuses from selected goals or filtered goals
        const statusSet = new Set<string>();

        let goalsToCheck = this.originalGoalData;

        // If goals are selected, only get statuses from those goals
        if (this.selectedGoals.length > 0) {
            goalsToCheck = this.originalGoalData.filter(goal =>
                this.selectedGoals.includes(goal.goalId)
            );
        } else if (this.selectedOrganization) {
            // If organization is selected, get statuses from that org's goals
            goalsToCheck = this.originalGoalData.filter(goal => {
                const goalOrgId = typeof goal.organization === 'object' ? goal.organization._id : goal.organization;
                return goalOrgId === this.selectedOrganization;
            });
        }

        goalsToCheck.forEach((goal: any) => {
            if (goal.stages) {
                goal.stages.forEach((stage: any) => {
                    statusSet.add(stage.status);
                });
            }
        });

        this.availableLeadStatuses = Array.from(statusSet);
    }

    applyClientSideFilters(): void {
        if (!this.originalGoalData) {
            this.filteredGoalData = [];
            return;
        }

        // Start with all goals
        let filtered = [...this.originalGoalData];

        // Filter by organization
        if (this.selectedOrganization) {
            filtered = filtered.filter(goal => {
                const goalOrgId = typeof goal.organization === 'object' ? goal.organization._id : goal.organization;
                return goalOrgId === this.selectedOrganization;
            });
        }
        // No default filter - show all goals unless organization is selected

        // Filter by goal status (active, closed, etc.)
        if (this.goalStatusFilter) {
            filtered = filtered.filter(goal => goal.status === this.goalStatusFilter);
        }

        // Filter by selected goals
        if (this.selectedGoals.length > 0) {
            filtered = filtered.filter(goal =>
                this.selectedGoals.includes(goal.goalId)
            );
        }

        // Filter each goal's member breakdown
        filtered = filtered.map(goal => {
            const filteredGoal = { ...goal };

            // Filter member breakdown
            filteredGoal.memberBreakdown = goal.memberBreakdown.map((member: any) => {
                const filteredMember = { ...member };

                // Filter stages
                filteredMember.stages = member.stages.map((stage: any) => {
                    let filteredLeads = [...stage.leads];

                    // Apply status filter
                    if (this.leadStatusFilter && stage.status !== this.leadStatusFilter) {
                        filteredLeads = [];
                    }

                    return {
                        ...stage,
                        leads: filteredLeads,
                        count: filteredLeads.length
                    };
                }).filter((stage: any) => {
                    // Keep stage if no status filter, or if it matches the filter
                    return !this.leadStatusFilter || stage.status === this.leadStatusFilter;
                });

                return filteredMember;
            });

            // Recalculate stage totals
            const stageTotals: any = {};
            filteredGoal.memberBreakdown.forEach((member: any) => {
                member.stages.forEach((stage: any) => {
                    if (!stageTotals[stage.status]) {
                        stageTotals[stage.status] = 0;
                    }
                    stageTotals[stage.status] += stage.count;
                });
            });

            filteredGoal.stages = Object.entries(stageTotals).map(([status, count]) => ({
                status,
                count
            }));

            return filteredGoal;
        });

        this.filteredGoalData = filtered;

        // Update dashboard data with filtered results
        if (this.dashboardData) {
            this.dashboardData = {
                ...this.dashboardData,
                goalStagesSummary: this.filteredGoalData
            };
        }
    }

    applyFilters(): void {
        this.applyClientSideFilters();
    }

    clearFilters(): void {
        this.selectedOrganization = '';
        this.selectedGoals = [];
        this.startDate = '';
        this.endDate = '';
        this.goalStatusFilter = '';
        this.leadStatusFilter = '';
        this.updateFilteredGoals();
        this.updateAvailableStatuses();
        this.applyClientSideFilters();
    }

    onOrganizationChange(): void {
        // Reset dependent filters
        this.selectedGoals = [];
        this.leadStatusFilter = '';

        // Update filtered goals based on organization
        this.updateFilteredGoals();

        // Update available statuses
        this.updateAvailableStatuses();

        // Apply filters
        this.applyClientSideFilters();
    }

    onGoalSelectionChange(): void {
        // Update available statuses based on selected goals
        this.updateAvailableStatuses();

        // Reset status filter if it's not in the new available statuses
        if (this.leadStatusFilter && !this.availableLeadStatuses.includes(this.leadStatusFilter)) {
            this.leadStatusFilter = '';
        }

        // Apply filters
        this.applyClientSideFilters();
    }

    toggleGoalDropdown(event?: Event): void {
        console.log('🔽 ========== DROPDOWN TOGGLE ==========');
        console.log('🔽 BEFORE - goalDropdownOpen:', this.goalDropdownOpen);
        console.log('🔽 filteredAvailableGoals:', this.filteredAvailableGoals);
        console.log('🔽 filteredAvailableGoals.length:', this.filteredAvailableGoals.length);

        // Prevent the click from bubbling to document listener
        if (event) {
            event.stopPropagation();
        }

        this.goalDropdownOpen = !this.goalDropdownOpen;
        console.log('🔽 AFTER - goalDropdownOpen:', this.goalDropdownOpen);

        if (this.goalDropdownOpen) {
            if (this.filteredAvailableGoals.length > 0) {
                console.log('✅ Dropdown OPEN with', this.filteredAvailableGoals.length, 'goals:');
                this.filteredAvailableGoals.forEach((g, i) => {
                    console.log(`  ${i + 1}. ${g.title} (ID: ${g.id})`);
                });
            } else {
                console.warn('⚠️ Dropdown OPEN but NO GOALS!');
            }
        }
        console.log('🔽 ======================================');
    }

    toggleGoalSelection(goalId: string): void {
        const index = this.selectedGoals.indexOf(goalId);
        if (index > -1) {
            this.selectedGoals.splice(index, 1);
        } else {
            this.selectedGoals.push(goalId);
        }
        this.onGoalSelectionChange();
    }

    @HostListener('document:click', ['$event'])
    closeDropdownOnClickOutside(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const dropdownWrapper = target.closest('.dropdown-wrapper');

        if (!dropdownWrapper && this.goalDropdownOpen) {
            console.log('🔽 [closeDropdownOnClickOutside] Closing dropdown');
            this.goalDropdownOpen = false;
        }
    }

    isGoalSelected(goalId: string): boolean {
        return this.selectedGoals.includes(goalId);
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
