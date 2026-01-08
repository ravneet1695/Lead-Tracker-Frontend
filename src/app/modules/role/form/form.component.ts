import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RoleService, Role } from '../../../services/role.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-role-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.css']
})
export class RoleFormComponent implements OnInit {
    roleForm!: FormGroup;
    isEditMode = false;
    roleId: string | null = null;
    loading = false;
    submitting = false;
    isSystemRole = false;
    organizations: any[] = [];
    currentUserRole: string = '';

    // Available permissions
    availablePermissions = [
        { category: 'Users', permissions: ['users.create', 'users.read', 'users.update', 'users.delete'] },
        { category: 'Groups', permissions: ['groups.create', 'groups.read', 'groups.update', 'groups.delete'] },
        { category: 'Goals', permissions: ['goals.create', 'goals.read', 'goals.update', 'goals.delete'] },
        { category: 'Goal Entries', permissions: ['goal-entries.create', 'goal-entries.read', 'goal-entries.update', 'goal-entries.delete'] },
        { category: 'Dashboard', permissions: ['dashboard.read'] },
        { category: 'Audit Logs', permissions: ['audit-logs.read', 'audit-logs.export'] },
        { category: 'Roles', permissions: ['roles.create', 'roles.read', 'roles.update', 'roles.delete'] }
    ];

    constructor(
        private fb: FormBuilder,
        private roleService: RoleService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        const user = this.authService.currentUserValue;
        this.currentUserRole = user?.role?.name || '';
        this.initializeForm();
        this.checkEditMode();
        this.loadOrganizations();
    }

    initializeForm(): void {
        this.roleForm = this.fb.group({
            name: ['', [Validators.required, Validators.pattern(/^[a-z_]+$/)]],
            label: ['', [Validators.required, Validators.minLength(2)]],
            description: [''],
            isSystem: [false],
            organization: [''],
            permissions: this.fb.array([]),
            isActive: [true]
        });

        // Default permission for new roles
        if (!this.isEditMode) {
            this.permissionsArray.push(this.fb.control('dashboard.read'));
        }

        // For non-Super Admin users, auto-populate organization with their organization
        if (!this.isSuperAdmin()) {
            const user = this.authService.currentUserValue;
            if (user?.organization) {
                const orgId = typeof user.organization === 'object'
                    ? (user.organization as any)._id
                    : user.organization;
                this.roleForm.patchValue({ organization: orgId });
            }
        }

        // Watch isSystem changes to update organization validation
        this.roleForm.get('isSystem')?.valueChanges.subscribe(isSystem => {
            const orgControl = this.roleForm.get('organization');
            if (isSystem) {
                orgControl?.clearValidators();
                orgControl?.setValue('');
            } else {
                orgControl?.setValidators([Validators.required]);
            }
            orgControl?.updateValueAndValidity();
        });
    }

    loadOrganizations(): void {
        this.organizationService.getOrganizations().subscribe({
            next: (response) => {
                this.organizations = response.organizations || [];
            },
            error: (error) => {
                console.error('Error loading organizations:', error);
            }
        });
    }

    isSuperAdmin(): boolean {
        return this.currentUserRole === 'super_admin';
    }

    checkEditMode(): void {
        this.roleId = this.route.snapshot.paramMap.get('id');
        if (this.roleId) {
            this.isEditMode = true;
            this.loadRole();
        }
    }

    loadRole(): void {
        if (!this.roleId) return;

        this.loading = true;
        this.roleService.getRole(this.roleId).subscribe({
            next: (response) => {
                if (response.role) {
                    const role = response.role;
                    this.isSystemRole = role.isSystem;

                    this.roleForm.patchValue({
                        name: role.name,
                        label: role.label,
                        description: role.description,
                        isActive: role.isActive
                    });

                    // Disable name field for system roles
                    if (this.isSystemRole) {
                        this.roleForm.get('name')?.disable();
                    }

                    // Set permissions
                    this.setPermissions(role.permissions || []);
                }
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading role:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load role'
                }).then(() => {
                    this.router.navigate(['/roles']);
                });
            }
        });
    }

    get permissionsArray(): FormArray {
        return this.roleForm.get('permissions') as FormArray;
    }

    setPermissions(permissions: string[]): void {
        const permissionsArray = this.permissionsArray;
        permissionsArray.clear();

        permissions.forEach(permission => {
            permissionsArray.push(this.fb.control(permission));
        });
    }

    isPermissionSelected(permission: string): boolean {
        return this.permissionsArray.value.includes(permission);
    }

    togglePermission(permission: string): void {
        const permissionsArray = this.permissionsArray;
        const index = permissionsArray.value.indexOf(permission);

        if (index > -1) {
            permissionsArray.removeAt(index);
        } else {
            permissionsArray.push(this.fb.control(permission));
        }
    }

    toggleAllPermissions(event: any): void {
        const permissionsArray = this.permissionsArray;

        if (event.target.checked) {
            // Select all permissions
            permissionsArray.clear();
            this.availablePermissions.forEach(category => {
                category.permissions.forEach(permission => {
                    permissionsArray.push(this.fb.control(permission));
                });
            });
        } else {
            // Deselect all
            permissionsArray.clear();
        }
    }

    areAllPermissionsSelected(): boolean {
        const totalPermissions = this.availablePermissions.reduce((sum, cat) => sum + cat.permissions.length, 0);
        return this.permissionsArray.length === totalPermissions;
    }

    onSubmit(): void {
        if (this.roleForm.invalid) {
            this.markFormGroupTouched(this.roleForm);
            return;
        }

        this.submitting = true;
        const formData = this.roleForm.getRawValue();

        // When editing, exclude immutable fields (isSystem, organization)
        if (this.isEditMode) {
            delete formData.isSystem;
            delete formData.organization;
        }

        const request = this.isEditMode
            ? this.roleService.updateRole(this.roleId!, formData)
            : this.roleService.createRole(formData);

        request.subscribe({
            next: (response) => {
                this.submitting = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: `Role ${this.isEditMode ? 'updated' : 'created'} successfully`,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    this.router.navigate(['/roles']);
                });
            },
            error: (error) => {
                console.error('Error saving role:', error);
                this.submitting = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} role`
                });
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/roles']);
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

    isFieldInvalid(fieldName: string): boolean {
        const field = this.roleForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.roleForm.get(fieldName);
        if (field && field.invalid && (field.dirty || field.touched)) {
            if (field.errors?.['required']) return `${this.getFieldLabel(fieldName)} is required`;
            if (field.errors?.['minlength']) {
                const minLength = field.errors['minlength'].requiredLength;
                return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
            }
            if (field.errors?.['pattern']) {
                if (fieldName === 'name') return 'Name must be lowercase letters and underscores only';
                return 'Invalid format';
            }
        }
        return '';
    }

    getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            'name': 'Name',
            'label': 'Label',
            'description': 'Description'
        };
        return labels[fieldName] || fieldName;
    }
}
