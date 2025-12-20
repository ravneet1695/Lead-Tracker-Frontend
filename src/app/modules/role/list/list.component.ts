import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RoleService, Role } from '../../../services/role.service';
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
    loading = false;
    searchTerm = '';
    statusFilter = 'active';

    constructor(
        private roleService: RoleService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadRoles();
    }

    loadRoles(): void {
        this.loading = true;
        const includeInactive = this.statusFilter === 'all';

        this.roleService.getRoles(includeInactive).subscribe({
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
            const matchesSearch = !this.searchTerm ||
                role.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                role.label.toLowerCase().includes(this.searchTerm.toLowerCase());

            const matchesStatus = this.statusFilter === 'all' ||
                (this.statusFilter === 'active' && role.isActive) ||
                (this.statusFilter === 'inactive' && !role.isActive);

            return matchesSearch && matchesStatus;
        });
    }

    onFilterChange(): void {
        this.loadRoles();
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
