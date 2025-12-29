import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService, User } from '../../../services/user.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush  // Optimize change detection
})
export class UserListComponent implements OnInit {
    users: User[] = [];
    filteredUsers: User[] = [];
    organizations: any[] = [];
    loading = false;
    currentUser: any;

    // Filters
    searchTerm = '';
    roleFilter = '';
    statusFilter = 'active';
    organizationFilter = 'all';

    // Filter options
    roles: { _id: string; name: string; label: string }[] = [];
    statuses = ['active', 'inactive'];

    constructor(
        private userService: UserService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private roleService: RoleService,
        private router: Router,
        private cdr: ChangeDetectorRef  // For manual change detection with OnPush
    ) { }

    ngOnInit(): void {
        this.currentUser = this.authService.currentUserValue;

        // Load data
        this.loadRoles();
        this.loadOrganizations();
        this.loadUsers();
    }

    loadRoles(): void {
        this.roleService.getRoles().subscribe({
            next: (response) => {
                this.roles = response.roles || [];
                this.cdr.markForCheck();  // Trigger change detection
            },
            error: (error) => {
                console.error('Error loading roles:', error);
            }
        });
    }

    loadOrganizations(): void {
        // Only load organizations if user can view all organizations (Super Admin)
        if (!this.canViewAllOrganizations()) {
            return;
        }

        this.organizationService.getOrganizations().subscribe({
            next: (response) => {
                this.organizations = response.organizations || [];
                this.cdr.markForCheck();  // Trigger change detection
            },
            error: (error) => {
                console.error('Error loading organizations:', error);
            }
        });
    }

    loadUsers(): void {
        this.loading = true;

        // Build query params
        const params: any = {};
        if (this.organizationFilter && this.organizationFilter !== 'all') {
            params.organization = this.organizationFilter;
        }

        this.userService.getUsers(params).subscribe({
            next: (response) => {
                this.users = response.users || response || [];
                this.applyFilters();
                this.loading = false;
                this.cdr.markForCheck();  // Trigger change detection
            },
            error: (error) => {
                console.error('Error loading users:', error);
                this.loading = false;
                this.cdr.markForCheck();  // Trigger change detection
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load users'
                });
            }
        });
    }

    applyFilters(): void {
        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = !this.searchTerm ||
                user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

            // Compare role._id with roleFilter (roleFilter is the role ID from dropdown)
            const userRoleId = typeof user.role === 'object' ? (user.role as any)?._id : user.role;
            const matchesRole = !this.roleFilter || userRoleId === this.roleFilter;
            const matchesStatus = !this.statusFilter || user.status === this.statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }

    onFilterChange(): void {
        // Reload users when organization filter changes (backend filtering)
        this.loadUsers();
    }

    clearFilters(): void {
        this.searchTerm = '';
        this.roleFilter = '';
        this.statusFilter = '';
        this.organizationFilter = '';
        this.applyFilters();
    }

    createUser(): void {
        this.router.navigate(['/users/new']);
    }

    editUser(id: string | undefined): void {
        if (id) {
            this.router.navigate(['/users/edit', id]);
        }
    }

    deleteUser(id: string | undefined): void {
        if (!id) return;

        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to delete this user?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.userService.deleteUser(id).subscribe({
                    next: () => {
                        Swal.fire('Deleted!', 'User has been deleted.', 'success');
                        this.loadUsers();
                    },
                    error: (error) => {
                        console.error('Error deleting user:', error);
                        Swal.fire('Error!', 'Failed to delete user.', 'error');
                    }
                });
            }
        });
    }

    activateUser(id: string | undefined): void {
        if (!id) return;

        Swal.fire({
            title: 'Activate User?',
            text: 'Do you want to activate this user?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, activate!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.userService.activateUser(id).subscribe({
                    next: () => {
                        Swal.fire('Activated!', 'User has been activated successfully.', 'success');
                        this.loadUsers();
                    },
                    error: (error) => {
                        console.error('Error activating user:', error);
                        Swal.fire('Error!', 'Failed to activate user.', 'error');
                    }
                });
            }
        });
    }

    getStatusBadgeClass(status: string): string {
        return status === 'active' ? 'badge-success' : 'badge-secondary';
    }

    // Stats calculation methods
    getTotalUsers(): number {
        return this.users.length;
    }

    getActiveUsers(): number {
        return this.users.filter(u => u.status === 'active').length;
    }

    // Helper methods
    getUserInitials(name: string): string {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    hasActiveFilters(): boolean {
        return !!(this.searchTerm || this.roleFilter || this.statusFilter || this.organizationFilter);
    }

    getRoleLabel(role: string): string {
        const roleMap: { [key: string]: string } = {
            'super_admin': 'ADMIN',
            'org_admin': 'ADMIN'
        };
        return roleMap[role] || role.toUpperCase();
    }

    getRoleName(role: string | { _id: string; name: string; label: string }): string {
        if (typeof role === 'object' && role !== null) {
            return role.name || 'org_admin';
        }
        return role || 'org_admin';
    }

    getRoleDisplayLabel(role: string | { _id: string; name: string; label: string }): string {
        if (typeof role === 'object' && role !== null) {
            return role.label || role.name || 'Org Admin';
        }
        return role || 'Org Admin';
    }

    getOrganizationName(organization: string | { _id: string; name: string } | undefined): string {
        if (!organization) return 'N/A';
        if (typeof organization === 'string') return 'N/A';
        return organization.name || 'N/A';
    }

    // Permission checking methods
    hasPermission(permission: string): boolean {
        return this.authService.hasPermission(permission);
    }

    canCreateUser(): boolean {
        return this.hasPermission('users.create');
    }

    canUpdateUser(): boolean {
        return this.hasPermission('users.update');
    }

    canDeleteUser(): boolean {
        return this.hasPermission('users.delete');
    }

    // Helper to check if user can view all organizations
    canViewAllOrganizations(): boolean {
        // Users with organizations.read permission can view all organizations
        return this.hasPermission('organizations.read');
    }

    // Helper to check if organization column should be shown
    shouldShowOrganizationColumn(): boolean {
        // Show organization column if user can view multiple organizations
        return this.canViewAllOrganizations();
    }
}
