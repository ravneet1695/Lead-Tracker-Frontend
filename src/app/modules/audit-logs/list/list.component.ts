import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService, AuditLog } from '../../../services/audit-log.service';
import { OrganizationService } from '../../../services/organization.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-audit-logs-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class AuditLogsListComponent implements OnInit {
  logs: AuditLog[] = [];
  loading = false;

  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalLogs = 0;
  limit = 50;

  // Filters
  searchTerm = '';
  actionFilter = '';
  resourceTypeFilter = '';
  organizationFilter = '';
  startDate = '';
  endDate = '';

  // Filter options
  actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'IMPORT', 'RESTORE', 'ARCHIVE'];
  resourceTypes = ['Organization', 'User', 'Group', 'Goal', 'GoalEntry', 'Report', 'Dashboard', 'Settings'];
  organizations: any[] = []; // Will be loaded from API

  constructor(
    private auditLogService: AuditLogService,
    private organizationService: OrganizationService
  ) { }

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadAuditLogs();
  }

  loadOrganizations(): void {
    // Load organizations for filter dropdown (super admin only)
    this.organizationService.getOrganizations().subscribe({
      next: (response) => {
        this.organizations = response.organizations || [];
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        // Don't show error to user, just log it
      }
    });
  }

  loadAuditLogs(): void {
    this.loading = true;

    const filters: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.actionFilter) filters.action = this.actionFilter;
    if (this.resourceTypeFilter) filters.resourceType = this.resourceTypeFilter;
    if (this.organizationFilter) filters.organizationId = this.organizationFilter;
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;

    this.auditLogService.getAuditLogs(filters).subscribe({
      next: (response) => {
        this.logs = response.logs;
        if (response.pagination) {
          this.currentPage = response.pagination.currentPage;
          this.totalPages = response.pagination.totalPages;
          this.totalLogs = response.pagination.totalLogs;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading audit logs:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load audit logs'
        });
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadAuditLogs();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.actionFilter = '';
    this.resourceTypeFilter = '';
    this.organizationFilter = '';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  exportToCSV(): void {
    const filters: any = {};

    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.actionFilter) filters.action = this.actionFilter;
    if (this.resourceTypeFilter) filters.resourceType = this.resourceTypeFilter;
    if (this.organizationFilter) filters.organizationId = this.organizationFilter;
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;

    // Build query string
    const queryParams = new URLSearchParams(filters as any).toString();
    const exportUrl = `${this.auditLogService['apiUrl']}/export/csv?${queryParams}`;

    // Open in new window to trigger download
    window.open(exportUrl, '_blank');

    Swal.fire({
      icon: 'success',
      title: 'Export Started',
      text: 'Your audit log export will download shortly',
      timer: 2000,
      showConfirmButton: false
    });
  }

  getActionBadgeClass(action: string): string {
    const classes: any = {
      'CREATE': 'badge-success',
      'UPDATE': 'badge-info',
      'DELETE': 'badge-danger',
      'LOGIN': 'badge-primary',
      'LOGOUT': 'badge-secondary',
      'VIEW': 'badge-light',
      'RESTORE': 'badge-warning'
    };
    return classes[action] || 'badge-secondary';
  }

  getStatusBadgeClass(status: string): string {
    const classes: any = {
      'SUCCESS': 'badge-success',
      'FAILURE': 'badge-danger',
      'PENDING': 'badge-warning'
    };
    return classes[status] || 'badge-secondary';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  getUserInitials(name: string): string {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  get pages(): number[] {
    const pages = [];
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}
