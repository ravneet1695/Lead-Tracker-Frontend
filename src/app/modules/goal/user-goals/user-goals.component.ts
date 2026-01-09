import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GoalService, Goal } from '../../../services/goal.service';
import { AuthService } from '../../../services/auth.service';
import { OrganizationService } from '../../../services/organization.service';
import { GroupService } from '../../../services/group.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-goals',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-goals.component.html',
  styleUrls: ['./user-goals.component.css']
})
export class UserGoalsComponent implements OnInit {
  goals: any[] = [];
  filteredGoals: any[] = [];
  organizations: any[] = [];
  groups: any[] = [];
  loading = true;
  expandedGoalId: string | null = null;
  currentUser: any;

  // Filters
  searchTerm = '';
  statusFilter = '';
  organizationFilter = 'all';
  groupFilter = '';

  // Filter options
  statuses = ['active', 'inactive'];

  constructor(
    private goalService: GoalService,
    private authService: AuthService,
    private organizationService: OrganizationService,
    private groupService: GroupService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadOrganizations();
    this.loadGroups();
    this.loadGoals();
  }

  loadOrganizations(): void {
    // Only load organizations if user can view all organizations (Super Admin)
    if (!this.canViewAllOrganizations()) {
      return;
    }

    this.organizationService.getOrganizations().subscribe({
      next: (response) => {
        this.organizations = response.organizations || [];
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
      }
    });
  }

  loadGroups(): void {
    // Build query params based on organization filter
    const params: any = {};
    if (this.organizationFilter && this.organizationFilter !== 'all') {
      params.organization = this.organizationFilter;
    }

    this.groupService.getGroups(params).subscribe({
      next: (response) => {
        this.groups = response.groups || [];
      },
      error: (error) => {
        console.error('Error loading groups:', error);
      }
    });
  }

  loadGoals(): void {
    this.loading = true;

    // Build query params for backend filtering
    const params: any = {};
    if (this.organizationFilter && this.organizationFilter !== 'all') {
      params.organization = this.organizationFilter;
    }

    this.goalService.getGoals(params).subscribe({
      next: (response) => {
        this.goals = response.goals || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading goals:', err);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredGoals = this.goals.filter(goal => {
      const matchesSearch = !this.searchTerm ||
        goal.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        goal.description?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = !this.statusFilter || goal.status === this.statusFilter;

      const goalGroupId = typeof goal.group === 'object' ? goal.group?._id : goal.group;
      const matchesGroup = !this.groupFilter || goalGroupId === this.groupFilter;

      return matchesSearch && matchesStatus && matchesGroup;
    });
  }

  onOrganizationFilterChange(): void {
    // Reload groups and goals when organization filter changes
    this.loadGroups();
    this.loadGoals();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.organizationFilter = 'all';
    this.groupFilter = '';
    this.applyFilters();
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  viewGoalDetails(goalId: string | undefined): void {
    if (goalId) {
      this.router.navigate(['/goals/view', goalId]);
    }
  }

  createLead(goalId: string | undefined): void {
    if (!goalId) {
      console.error('Cannot create lead: goalId is undefined');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid goal selected'
      });
      return;
    }

    this.router.navigate(['/leads/create', goalId])
      .then(success => {
        if (!success) {
          console.error('Navigation to create-lead failed');
          Swal.fire({
            icon: 'error',
            title: 'Navigation Failed',
            text: 'Unable to navigate to create lead page. Please check your permissions.'
          });
        }
      })
      .catch(error => {
        console.error('Navigation error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Navigation Error',
          text: 'An error occurred while navigating to create lead page.'
        });
      });
  }

  canCreateLead(goal: any): boolean {
    // Cannot create lead if goal is inactive or expired
    return goal.status === 'active' && !goal.isExpired;
  }

  goBack(): void {
    const role = this.authService.currentUserValue?.role || 'sales';
    this.router.navigate([`/${role}/dashboard`]);
  }

  logout(): void {
    this.authService.logout();
  }

  getActiveGoalsCount(): number {
    return this.filteredGoals.filter(goal => goal.status === 'active').length;
  }

  // Permission checking methods
  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  canViewAllOrganizations(): boolean {
    // Users with organizations.read permission can view all organizations
    return this.hasPermission('organizations.read');
  }

  getGroupName(group: string | { _id: string; name: string } | undefined): string {
    if (!group) return 'N/A';
    if (typeof group === 'string') return 'N/A';
    return group.name || 'N/A';
  }

  getOrganizationName(organization: string | { _id: string; name: string } | undefined): string {
    if (!organization) return 'N/A';
    if (typeof organization === 'string') return 'N/A';
    return organization.name || 'N/A';
  }
}
