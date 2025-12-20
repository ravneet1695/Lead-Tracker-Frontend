import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterConfigService, MasterConfig, LeadStatus, CustomField } from '../../../services/master-config.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-master-config',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.css']
})
export class MasterConfigListComponent implements OnInit {
    config: MasterConfig | null = null;
    loading = false;
    saving = false;
    activeTab = 'leads';

    // Temporary input values
    newLeadSource = '';
    newProductCategory = '';
    newTag = '';
    newStatusName = '';
    newStatusColor = '#667eea';

    constructor(private masterConfigService: MasterConfigService) { }

    ngOnInit(): void {
        this.loadConfig();
    }

    loadConfig(): void {
        this.loading = true;
        this.masterConfigService.getConfig().subscribe({
            next: (response) => {
                this.config = response.config;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading config:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load master configuration'
                });
            }
        });
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;
    }

    // Lead Sources
    addLeadSource(): void {
        if (!this.newLeadSource.trim() || !this.config) return;

        if (!this.config.leadSources.includes(this.newLeadSource.trim())) {
            this.config.leadSources.push(this.newLeadSource.trim());
            this.newLeadSource = '';
        }
    }

    removeLeadSource(index: number): void {
        if (!this.config) return;
        this.config.leadSources.splice(index, 1);
    }

    // Lead Statuses
    addLeadStatus(): void {
        if (!this.newStatusName.trim() || !this.config) return;

        const newStatus: LeadStatus = {
            name: this.newStatusName.trim(),
            color: this.newStatusColor,
            order: this.config.leadStatuses.length + 1,
            isDefault: false
        };

        this.config.leadStatuses.push(newStatus);
        this.newStatusName = '';
        this.newStatusColor = '#667eea';
    }

    removeLeadStatus(index: number): void {
        if (!this.config) return;
        this.config.leadStatuses.splice(index, 1);
        // Reorder remaining statuses
        this.config.leadStatuses.forEach((status, i) => {
            status.order = i + 1;
        });
    }

    setDefaultStatus(index: number): void {
        if (!this.config) return;
        this.config.leadStatuses.forEach((status, i) => {
            status.isDefault = i === index;
        });
    }

    // Product Categories
    addProductCategory(): void {
        if (!this.newProductCategory.trim() || !this.config) return;

        if (!this.config.productCategories.includes(this.newProductCategory.trim())) {
            this.config.productCategories.push(this.newProductCategory.trim());
            this.newProductCategory = '';
        }
    }

    removeProductCategory(index: number): void {
        if (!this.config) return;
        this.config.productCategories.splice(index, 1);
    }

    // Tags
    addTag(): void {
        if (!this.newTag.trim() || !this.config) return;

        if (!this.config.tags.includes(this.newTag.trim())) {
            this.config.tags.push(this.newTag.trim());
            this.newTag = '';
        }
    }

    removeTag(index: number): void {
        if (!this.config) return;
        this.config.tags.splice(index, 1);
    }

    // Save Configuration
    saveConfig(): void {
        if (!this.config) return;

        this.saving = true;
        this.masterConfigService.updateConfig(this.config).subscribe({
            next: (response) => {
                this.saving = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Master configuration saved successfully',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: (error) => {
                console.error('Error saving config:', error);
                this.saving = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to save master configuration'
                });
            }
        });
    }

    // Seed Default Data
    seedDefaultData(): void {
        Swal.fire({
            title: 'Initialize Default Data?',
            text: 'This will create default master data for your organization.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, initialize',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.masterConfigService.seedDefaultConfig().subscribe({
                    next: (response) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: 'Default data initialized successfully',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadConfig();
                    },
                    error: (error) => {
                        console.error('Error seeding data:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: error.error?.message || 'Failed to initialize default data'
                        });
                    }
                });
            }
        });
    }
}
