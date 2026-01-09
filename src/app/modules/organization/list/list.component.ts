import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizationService, Organization } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-organization-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.css']
})
export class OrganizationListComponent implements OnInit {
    organizations: Organization[] = [];
    filteredOrganizations: Organization[] = [];
    loading = true;
    searchTerm = '';
    statusFilter = '';
    currentPage = 1;
    totalPages = 1;
    totalOrganizations = 0;
    limit = 10;

    constructor(
        private organizationService: OrganizationService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadOrganizations();
    }

    loadOrganizations(): void {
        this.loading = true;
        const params = {
            search: this.searchTerm || undefined,
            status: this.statusFilter || undefined,
            page: this.currentPage,
            limit: this.limit
        };

        this.organizationService.getOrganizations(params).subscribe({
            next: (response) => {
                this.organizations = response.organizations;
                this.filteredOrganizations = response.organizations;
                this.totalPages = response.pages;
                this.totalOrganizations = response.total;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading organizations:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load organizations'
                });
            }
        });
    }

    onSearch(): void {
        this.currentPage = 1;
        this.loadOrganizations();
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.loadOrganizations();
    }

    onPageChange(page: number): void {
        this.currentPage = page;
        this.loadOrganizations();
    }

    createOrganization(): void {
        this.router.navigate(['/organizations/new']);
    }

    editOrganization(id: string | undefined): void {
        if (!id) return;
        this.router.navigate([`/organizations/${id}/edit`]);
    }

    deleteOrganization(id: string | undefined): void {
        if (!id) return;
        const org = this.organizations.find(o => o._id === id);
        if (!org) return;

        Swal.fire({
            title: 'Delete Organization?',
            html: `Are you sure you want to delete <strong>${org.name}</strong>?<br><small>This action can be undone later.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.organizationService.deleteOrganization(id).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Organization has been deleted.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadOrganizations();
                    },
                    error: (error) => {
                        console.error('Error deleting organization:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete organization'
                        });
                    }
                });
            }
        });
    }

    toggleStatus(id: string | undefined, currentStatus: string | undefined): void {
        if (!id) return;
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = currentStatus === 'active' ? 'deactivate' : 'activate';

        Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Organization?`,
            text: `Are you sure you want to ${action} this organization?`,
            icon: currentStatus === 'active' ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: currentStatus === 'active' ? '#f59e0b' : '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, ${action} it!`,
        }).then((result) => {
            if (result.isConfirmed) {
                this.organizationService.toggleStatus(id, newStatus).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: `Organization has been ${action}d.`,
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadOrganizations();
                    },
                    error: (error) => {
                        console.error(`Error ${action}ing organization:`, error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: `Failed to ${action} organization`
                        });
                    }
                });
            }
        });
    }

    getStatusBadgeClass(status: string): string {
        return status === 'active' ? 'badge-active' : 'badge-inactive';
    }

    getOrgInitials(name: string): string {
        if (!name) return 'O';
        const names = name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    get pages(): number[] {
        return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    // Permission checking methods
    hasPermission(permission: string): boolean {
        return this.authService.hasPermission(permission);
    }

    canCreateOrganization(): boolean {
        return this.hasPermission('organizations.create');
    }

    canUpdateOrganization(): boolean {
        return this.hasPermission('organizations.update');
    }

    canDeleteOrganization(): boolean {
        return this.hasPermission('organizations.delete');
    }
}
