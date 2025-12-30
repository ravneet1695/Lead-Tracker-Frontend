import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RoleService, Role } from '../../../services/role.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-role-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.css']
})
export class RoleListComponent implements OnInit {
    roles: Role[] = [];
    filteredRoles: Role[] = [];
    organizations: any[] = [];
    loading = false;
    searchTerm = '';
    statusFilter = 'active';
    organizationFilter = 'all'; // For Super Admin
    currentUser: any;

    constructor(
        private roleService: RoleService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.currentUser = this.authService.currentUserValue;

        if (this.isSuperAdmin()) {
            // Super Admin: Load organizations for filter dropdown
            this.loadOrganizations();
        } else if (this.isOrgAdmin()) {
            // Org Admin: Set organization filter to their org (hidden in UI)
            this.organizationFilter = this.currentUser?.organization?._id || this.currentUser?.organization;
        }

        this.loadRoles();
    }

    isSuperAdmin(): boolean {
        return this.currentUser?.role?.name === 'super_admin';
    }

    isOrgAdmin(): boolean {
        return this.currentUser?.role?.name === 'org_admin';
    }

    loadOrganizations(): void {
        this.organizationService.getOrganizations().subscribe({
            next: (response: any) => {
                this.organizations = response.organizations || [];
            },
            error: (error) => {
                console.error('Error loading organizations:', error);
            }
        });
    }

    loadRoles(): void {
        this.loading = true;

        // Build query parameters
        const params: any = {};

        // Include inactive roles if "All Status" is selected
        if (this.statusFilter === 'all') {
            params.includeInactive = true;
        }

        // Add organization filter
        if (this.isSuperAdmin()) {
            // Super Admin: Include organization param only if specific org selected
            if (this.organizationFilter && this.organizationFilter !== 'all') {
                params.organization = this.organizationFilter;
            }
        } else {
            // Org Admin: Always filter by their organization
            params.organization = this.organizationFilter;
        }

        this.roleService.getRolesByOrganization(params.organization || '', params.includeInactive || false).subscribe({
            next: (response) => {
                this.roles = response.roles || [];
                this.applyFilters();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading roles:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load roles'
                });
            }
        });
    }

    applyFilters(): void {
        this.filteredRoles = this.roles.filter(role => {
            // Search filter
            const matchesSearch = !this.searchTerm ||
                role.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                role.label.toLowerCase().includes(this.searchTerm.toLowerCase());

            // Status filter (client-side for better UX)
            const matchesStatus = this.statusFilter === 'all' ||
                (this.statusFilter === 'active' && role.isActive) ||
                (this.statusFilter === 'inactive' && !role.isActive);

            return matchesSearch && matchesStatus;
        });
    }

    onOrganizationChange(): void {
        // Reload roles when organization filter changes (Super Admin only)
        this.loadRoles();
    }

    onStatusChange(): void {
        // Reload roles when status filter changes
        this.loadRoles();
    }

    onSearchChange(): void {
        // Apply client-side filtering for search
        this.applyFilters();
    }

    createRole(): void {
        this.router.navigate(['/roles/new']);
    }

    editRole(id: string): void {
        this.router.navigate(['/roles/edit', id]);
    }

    deleteRole(role: Role): void {
        if (role.isSystem) {
            Swal.fire({
                icon: 'warning',
                title: 'Cannot Delete',
                text: 'System roles cannot be deleted'
            });
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete the role "${role.label}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.roleService.deleteRole(role._id).subscribe({
                    next: () => {
                        Swal.fire('Deleted!', 'Role has been deleted.', 'success');
                        this.loadRoles();
                    },
                    error: (error) => {
                        console.error('Error deleting role:', error);
                        Swal.fire('Error!', error.error?.message || 'Failed to delete role.', 'error');
                    }
                });
            }
        });
    }

    toggleRoleStatus(role: Role): void {
        if (role.isSystem) {
            Swal.fire({
                icon: 'warning',
                title: 'Cannot Modify',
                text: 'System roles cannot be deactivated'
            });
            return;
        }

        const newStatus = !role.isActive;
        const action = newStatus ? 'activate' : 'deactivate';

        Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Role?`,
            text: `Do you want to ${action} "${role.label}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus ? '#10b981' : '#f59e0b',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, ${action}!`
        }).then((result) => {
            if (result.isConfirmed) {
                this.roleService.updateRole(role._id, { isActive: newStatus }).subscribe({
                    next: () => {
                        Swal.fire('Success!', `Role has been ${action}d.`, 'success');
                        this.loadRoles();
                    },
                    error: (error) => {
                        console.error(`Error ${action}ing role:`, error);
                        Swal.fire('Error!', `Failed to ${action} role.`, 'error');
                    }
                });
            }
        });
    }

    getPermissionCount(role: Role): number {
        return role.permissions?.length || 0;
    }

    hasWildcardPermission(role: Role): boolean {
        return role.permissions?.includes('*') || false;
    }

    getOrganizationName(role: Role): string {
        if (role.isSystem) {
            return 'Global';
        }
        if (role.organization) {
            if (typeof role.organization === 'object') {
                return role.organization.name || 'Unknown';
            }
            return 'Custom';
        }
        return 'N/A';
    }

    // Permission checking methods
    hasPermission(permission: string): boolean {
        return this.authService.hasPermission(permission);
    }

    canCreateRole(): boolean {
        return this.hasPermission('roles.create');
    }

    canUpdateRole(): boolean {
        return this.hasPermission('roles.update');
    }

    canDeleteRole(): boolean {
        return this.hasPermission('roles.delete');
    }
}
