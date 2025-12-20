import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-group-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss']
})
export class GroupListComponent implements OnInit {
    groups: any[] = [];
    filteredGroups: any[] = [];
    organizations: any[] = [];
    loading = false;

    // Filters
    searchTerm = '';
    statusFilter = '';
    organizationFilter = 'all';

    constructor(
        private groupService: GroupService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadGroups();
        this.loadOrganizations();
    }

    loadGroups(): void {
        this.loading = true;
        const params: any = {};

        if (this.statusFilter) {
            params.status = this.statusFilter;
        }

        if (this.organizationFilter && this.organizationFilter !== 'all') {
            params.organization = this.organizationFilter;
        }

        this.groupService.getGroups(params).subscribe({
            next: (response) => {
                this.groups = response.groups || [];
                this.applyFilters();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading groups:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load groups'
                });
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
            },
            error: (error) => {
                console.error('Error loading organizations:', error);
            }
        });
    }

    applyFilters(): void {
        this.filteredGroups = this.groups.filter(group => {
            const matchesSearch = !this.searchTerm ||
                group.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                group.code.toLowerCase().includes(this.searchTerm.toLowerCase());

            return matchesSearch;
        });
    }

    onFilterChange(): void {
        // Reload groups when organization filter changes (backend filtering)
        this.loadGroups();
    }

    clearFilters(): void {
        this.searchTerm = '';
        this.statusFilter = '';
        this.organizationFilter = 'all';
        this.loadGroups();
    }

    createGroup(): void {
        this.router.navigate(['/groups/new']);
    }

    editGroup(id: string): void {
        this.router.navigate(['/groups/edit', id]);
    }

    deleteGroup(group: any): void {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete the group "${group.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.groupService.deleteGroup(group._id).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Group has been deleted.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadGroups();
                    },
                    error: (error) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: error.error?.message || 'Failed to delete group'
                        });
                    }
                });
            }
        });
    }

    toggleGroupStatus(group: any): void {
        this.groupService.toggleGroupStatus(group._id).subscribe({
            next: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: `Group ${group.isActive ? 'deactivated' : 'activated'} successfully`,
                    timer: 2000,
                    showConfirmButton: false
                });
                this.loadGroups();
            },
            error: (error) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || 'Failed to update group status'
                });
            }
        });
    }

    // Permission checks
    canCreateGroup(): boolean {
        return this.authService.hasPermission('groups.create');
    }

    canUpdateGroup(): boolean {
        return this.authService.hasPermission('groups.update');
    }

    canDeleteGroup(): boolean {
        return this.authService.hasPermission('groups.delete');
    }

    canViewAllOrganizations(): boolean {
        return this.authService.hasPermission('organizations.read');
    }
}
