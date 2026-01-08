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
    isUserRestricted: boolean = false; // Flag for UI restrictions (non-Super Admins)

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
        this.checkUserPermissions();
        this.loadDashboardData();
    }

    private checkUserPermissions(): void {
        const user = this.authService.currentUserValue;
        if (user && user.role?.name !== 'super_admin') {
            this.isUserRestricted = true;
            if (user.organization?._id) {
                this.selectedOrganization = user.organization._id;
                console.log('🛡️ Restricted user detected, auto-mapping to organization:', this.selectedOrganization);
            }
        }
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
        // Extract statuses from the CURRENT organizational/goal context
        const statusSet = new Set<string>();

        // If specific goals are selected, only show statuses from those goals
        // Otherwise, show statuses from all goals available in the current org filter
        const relevantGoals = this.selectedGoals.length > 0
            ? this.originalGoalData.filter(g => this.selectedGoals.includes(g.goalId || g._id))
            : this.filteredAvailableGoals.map(ag => this.originalGoalData.find(g => (g.goalId || g._id) === ag.id)).filter(g => !!g);

        relevantGoals.forEach((goal: any) => {
            // First check statusOptions (the intended schema)
            if (goal.statusOptions && goal.statusOptions.length > 0) {
                goal.statusOptions.forEach((s: string) => statusSet.add(s));
            }

            // Also check actual stages in data for any "discovered" statuses
            if (goal.stages) {
                goal.stages.forEach((stage: any) => {
                    if (stage.status) {
                        statusSet.add(stage.status);
                    }
                });
            }
        });

        this.availableLeadStatuses = Array.from(statusSet).sort();
        console.log(`📋 Discovered ${this.availableLeadStatuses.length} Lead Statuses for current context`);
    }

    applyClientSideFilters(): void {
        console.log('🔄 [applyClientSideFilters] Starting...', {
            selectedOrg: this.selectedOrganization,
            selectedGoals: this.selectedGoals,
            leadStatusFilter: this.leadStatusFilter
        });

        if (!this.originalGoalData || !Array.isArray(this.originalGoalData)) {
            console.warn('⚠️ No original goal data to filter');
            this.filteredGoalData = [];
            return;
        }

        // Start with all goals
        let filtered = this.originalGoalData.map(g => ({ ...g }));

        // Filter by organization
        if (this.selectedOrganization) {
            filtered = filtered.filter(goal => {
                const org = goal.organization;
                const goalOrgId = typeof org === 'object' ? org._id : org;
                return goalOrgId === this.selectedOrganization;
            });
        }

        // Filter by goal status (active, closed, etc.)
        if (this.goalStatusFilter) {
            filtered = filtered.filter(goal => goal.status === this.goalStatusFilter);
        }

        // Filter by selected goals
        if (this.selectedGoals.length > 0) {
            filtered = filtered.filter(goal => {
                const goalId = goal.goalId || goal._id;
                return this.selectedGoals.includes(goalId);
            });
        }

        console.log(`📡 Goals after initial filtering: ${filtered.length}`);

        // Process each goal to filter leads while preserving status columns
        filtered = filtered.map(goal => {
            const goalId = goal.goalId || goal._id;

            // Find the original goal to get its full set of defined stages
            const originalGoal = this.originalGoalData.find(g => (g.goalId || g._id) === goalId);

            // Extract all statuses specifically for this goal
            const statusOptions = (originalGoal && originalGoal.statusOptions && originalGoal.statusOptions.length > 0)
                ? originalGoal.statusOptions
                : (goal.statusOptions && goal.statusOptions.length > 0 ? goal.statusOptions : []);

            const stageSource = (originalGoal && originalGoal.stages) ? originalGoal.stages : (goal.stages || []);

            // If statusOptions exist, they are the source of truth for "as per the goal"
            // If not, use whatever statuses are actually present in the data
            const allGoalStatuses = statusOptions.length > 0
                ? statusOptions
                : Array.from(new Set(stageSource.map((s: any) => s.status))).filter(s => !!s);

            if (allGoalStatuses.length === 0) {
                console.warn(`⚠️ Goal ${goalId} (${goal.goalTitle}) has NO STAGES or status options!`, goal);
            }

            const processedGoal = { ...goal };

            // Filter member breakdown while keeping ALL stage keys (even if empty)
            processedGoal.memberBreakdown = (goal.memberBreakdown || []).map((member: any) => {
                const processedMember = { ...member };

                // Map across ALL possible statuses for this goal
                processedMember.stages = allGoalStatuses.map((status: string) => {
                    // Find if member has data for this status
                    const existingStage = (member.stages || []).find((s: any) => s.status === status);
                    let leads = existingStage ? [...(existingStage.leads || [])] : [];

                    // Apply lead entry status filter
                    if (this.leadStatusFilter && status !== this.leadStatusFilter) {
                        leads = [];
                    }

                    return {
                        status,
                        leads,
                        count: leads.length
                    };
                });

                return processedMember;
            });

            // Recalculate stage totals across ALL statuses
            processedGoal.stages = allGoalStatuses.map((status: string) => {
                let totalCount = 0;
                processedGoal.memberBreakdown.forEach((member: any) => {
                    const memberStage = member.stages.find((s: any) => s.status === status);
                    totalCount += memberStage?.count || 0;
                });

                return {
                    status,
                    count: totalCount
                };
            }).filter((stage: any) => {
                // If a status filter is active, only show that column
                // Otherwise show all columns for this goal
                return !this.leadStatusFilter || stage.status === this.leadStatusFilter;
            });

            return processedGoal;
        });

        this.filteredGoalData = filtered;
        console.log('✅ [applyClientSideFilters] Completed. Filtered goals:', this.filteredGoalData.length);

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

    isRestricted(): boolean {
        return this.isUserRestricted;
    }
}
