import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { UserService } from '../../../services/user.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-group-form',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss']
})
export class GroupFormComponent implements OnInit {
    groupForm!: FormGroup;
    isEditMode = false;
    groupId: string | null = null;
    submitting = false;

    users: any[] = [];
    organizations: any[] = [];
    showOrganizationField = false;

    constructor(
        private fb: FormBuilder,
        private groupService: GroupService,
        private userService: UserService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.checkPermissions();
        this.initializeForm();
        this.checkEditMode();
        this.loadOrganizations();
        this.loadUsers();
    }

    checkPermissions(): void {
        const currentUser = this.authService.currentUserValue;
        if (!currentUser) return;

        // Show organization field if user can manage organizations (Super Admin)
        this.showOrganizationField = this.authService.hasPermission('organizations.read');
    }

    initializeForm(): void {
        this.groupForm = this.fb.group({
            code: ['', [Validators.required]],
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: [''],
            organization: [''],
            users: [[]],
            managers: [[]]
        });

        // For Super Admin in create mode, make organization required
        if (this.showOrganizationField && !this.isEditMode) {
            this.groupForm.get('organization')?.setValidators([Validators.required]);
            this.groupForm.get('organization')?.updateValueAndValidity();
        }

        // For non-Super Admin users, auto-populate organization
        if (!this.showOrganizationField) {
            const user = this.authService.currentUserValue;
            if (user?.organization) {
                const orgId = typeof user.organization === 'object'
                    ? (user.organization as any)._id
                    : user.organization;
                this.groupForm.patchValue({ organization: orgId });
            }
        }

        // Listen to organization changes to reload users and fetch new code
        this.groupForm.get('organization')?.valueChanges.subscribe(orgId => {
            if (orgId) {
                this.loadUsersByOrganization(orgId);
                // Fetch new code for the selected organization
                if (!this.isEditMode) {
                    this.fetchNextGroupCodeForOrganization(orgId);
                }
            } else {
                // Clear users and code when organization is deselected
                this.users = [];
                this.groupForm.patchValue({
                    code: '',
                    users: [],
                    managers: []
                });
            }
        });
    }

    checkEditMode(): void {
        this.groupId = this.route.snapshot.paramMap.get('id');
        this.isEditMode = !!this.groupId;

        if (this.isEditMode && this.groupId) {
            this.loadGroup(this.groupId);
        } else {
            // Only fetch code for non-Super Admin (Org Admin)
            // Super Admin must select organization first
            if (!this.showOrganizationField) {
                this.fetchNextGroupCode();
            }
        }
    }

    fetchNextGroupCode(): void {
        // This is only called for Org Admin (non-Super Admin)
        this.groupService.getNextGroupCode().subscribe({
            next: (response) => {
                this.groupForm.patchValue({ code: response.code });
            },
            error: (error) => {
                console.error('Error fetching next code:', error);
                // Show error to user
                if (error.status === 403 || error.status === 400) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Code Generation Issue',
                        text: error.error?.message || 'Failed to generate group code. Please contact administrator.',
                        timer: 3000
                    });
                }
            }
        });
    }

    fetchNextGroupCodeForOrganization(organizationId: string): void {
        this.groupService.getNextGroupCode({ organization: organizationId }).subscribe({
            next: (response) => {
                this.groupForm.patchValue({ code: response.code });
            },
            error: (error) => {
                console.error('Error fetching next code for organization:', error);
                this.groupForm.patchValue({ code: 'GRP0001' });
            }
        });
    }

    loadGroup(id: string): void {
        this.groupService.getGroup(id).subscribe({
            next: (response) => {
                const group = response.group;
                this.groupForm.patchValue({
                    code: group.code,
                    name: group.name,
                    description: group.description,
                    organization: group.organization?._id,
                    users: group.users.map((u: any) => u._id),
                    managers: group.managers.map((m: any) => m._id)
                });

                // Load users for this organization
                if (group.organization?._id) {
                    this.loadUsersByOrganization(group.organization._id);
                }
            },
            error: (error) => {
                console.error('Error loading group:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load group details'
                });
                this.router.navigate(['/groups']);
            }
        });
    }

    loadOrganizations(): void {
        // Only load organizations if user needs to see the organization dropdown
        if (!this.showOrganizationField) {
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

    loadUsers(): void {
        // If organization is already set, load users for that organization
        const orgId = this.groupForm.get('organization')?.value;
        if (orgId) {
            this.loadUsersByOrganization(orgId);
        } else if (!this.showOrganizationField) {
            // For non-Super Admin, load users from their organization
            const user = this.authService.currentUserValue;
            if (user?.organization) {
                const userOrgId = typeof user.organization === 'object'
                    ? (user.organization as any)._id
                    : user.organization;
                this.loadUsersByOrganization(userOrgId);
            }
        }
    }

    loadUsersByOrganization(organizationId: string): void {
        this.userService.getUsers({ organization: organizationId }).subscribe({
            next: (response) => {
                this.users = response.users || [];
            },
            error: (error) => {
                console.error('Error loading users:', error);
            }
        });
    }

    onSubmit(): void {
        if (this.groupForm.invalid) {
            this.markFormGroupTouched(this.groupForm);
            return;
        }

        this.submitting = true;
        const formData = this.groupForm.getRawValue();

        // Validate at least one user
        const users = formData.users || [];
        if (users.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please select at least one user for the group'
            });
            this.submitting = false;
            return;
        }

        // Validate at least one manager
        const managers = formData.managers || [];
        if (managers.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please select at least one manager for the group'
            });
            this.submitting = false;
            return;
        }

        // Validate managers are subset of users
        const invalidManagers = managers.filter((m: string) => !users.includes(m));
        if (invalidManagers.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'All managers must be members of the group'
            });
            this.submitting = false;
            return;
        }

        const request = this.isEditMode
            ? this.groupService.updateGroup(this.groupId!, formData)
            : this.groupService.createGroup(formData);

        request.subscribe({
            next: (response) => {
                this.submitting = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: `Group ${this.isEditMode ? 'updated' : 'created'} successfully`,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    this.router.navigate(['/groups']);
                });
            },
            error: (error) => {
                console.error('Error saving group:', error);
                this.submitting = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} group`
                });
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/groups']);
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.groupForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.groupForm.get(fieldName);
        if (field?.errors) {
            if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
            if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
            if (field.errors['email']) return 'Invalid email format';
        }
        return '';
    }

    getFieldLabel(fieldName: string): string {
        const labels: any = {
            code: 'Code',
            name: 'Name',
            description: 'Description',
            organization: 'Organization',
            users: 'Users',
            managers: 'Managers'
        };
        return labels[fieldName] || fieldName;
    }

    // Checkbox helper methods
    isUserSelected(userId: string): boolean {
        const users = this.groupForm.get('users')?.value || [];
        return users.includes(userId);
    }

    isManagerSelected(userId: string): boolean {
        const managers = this.groupForm.get('managers')?.value || [];
        return managers.includes(userId);
    }

    toggleUser(userId: string, event: any): void {
        const users = this.groupForm.get('users')?.value || [];
        const managers = this.groupForm.get('managers')?.value || [];

        if (event.target.checked) {
            // Add user
            if (!users.includes(userId)) {
                this.groupForm.patchValue({ users: [...users, userId] });
            }
        } else {
            // Remove user
            const updatedUsers = users.filter((id: string) => id !== userId);
            this.groupForm.patchValue({ users: updatedUsers });

            // Also remove from managers if they were a manager
            if (managers.includes(userId)) {
                const updatedManagers = managers.filter((id: string) => id !== userId);
                this.groupForm.patchValue({ managers: updatedManagers });
            }
        }
    }

    toggleManager(userId: string, event: any): void {
        const managers = this.groupForm.get('managers')?.value || [];

        if (event.target.checked) {
            // Add manager
            if (!managers.includes(userId)) {
                this.groupForm.patchValue({ managers: [...managers, userId] });
            }
        } else {
            // Remove manager
            const updatedManagers = managers.filter((id: string) => id !== userId);
            this.groupForm.patchValue({ managers: updatedManagers });
        }
    }

    getSelectedUsers(): any[] {
        const selectedUserIds = this.groupForm.get('users')?.value || [];
        return this.users.filter(user => selectedUserIds.includes(user._id));
    }

    getSelectedManagersCount(): number {
        return (this.groupForm.get('managers')?.value || []).length;
    }

    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);
            control?.markAsTouched();
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    }
}
