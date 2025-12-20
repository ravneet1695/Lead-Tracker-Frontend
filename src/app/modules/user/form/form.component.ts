import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService, User } from '../../../services/user.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.css']
})
export class UserFormComponent implements OnInit {
    userForm!: FormGroup;
    isEditMode = false;
    userId: string | null = null;
    loading = false;
    submitting = false;
    selectedFile: File | null = null;
    imagePreview: string | null = null;

    // Dropdown options
    organizations: any[] = [];
    showOrganizationField = false;
    roles: { value: string; label: string }[] = [];
    statuses = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private roleService: RoleService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.checkCurrentUserRole();
        this.initializeForm();
        this.loadRoles();
        this.loadOrganizations();
        this.checkEditMode();
    }

    checkCurrentUserRole(): void {
        const currentUser = this.authService.currentUserValue;
        if (!currentUser) return;

        // Show organization field if user can manage organizations
        this.showOrganizationField = this.authService.hasPermission('organizations.read');
    }

    initializeForm(): void {
        this.userForm = this.fb.group({
            code: [''],
            firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
            lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
            email: ['', [Validators.required, Validators.email]],
            mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
            password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(8)]],
            role: ['sales', [Validators.required]],
            organization: [''],
            status: ['active', [Validators.required]]
        });

        // Listen to role changes to handle organization field requirement
        this.userForm.get('role')?.valueChanges.subscribe(role => {
            this.onRoleChange(role);
        });

        // Listen to organization changes to reload roles and enable/disable role dropdown
        this.userForm.get('organization')?.valueChanges.subscribe(orgId => {
            const roleControl = this.userForm.get('role');

            if (orgId) {
                // Enable role dropdown and load filtered roles
                roleControl?.enable({ emitEvent: false });
                this.loadRolesByOrganization(orgId);
            } else {
                // Disable role dropdown and clear selection
                roleControl?.disable({ emitEvent: false });
                roleControl?.setValue('', { emitEvent: false });
                this.loadRoles();
            }
        });

        // Initialize role dropdown state based on organization field visibility
        if (this.showOrganizationField) {
            const orgValue = this.userForm.get('organization')?.value;
            if (!orgValue) {
                this.userForm.get('role')?.disable();
            }
        } else {
            // For non-Super Admin users, auto-populate organization and load roles
            const user = this.authService.currentUserValue;
            if (user?.organization) {
                const orgId = typeof user.organization === 'object'
                    ? (user.organization as any)._id
                    : user.organization;

                // Set organization value
                this.userForm.patchValue({ organization: orgId });

                // Enable role dropdown and load roles for this organization
                this.userForm.get('role')?.enable({ emitEvent: false });
                this.loadRolesByOrganization(orgId);
            }
        }

        // Fetch next user code if not in edit mode
        if (!this.isEditMode) {
            this.fetchNextUserCode();
        }
    }

    loadRoles(): void {
        this.roleService.getRoles().subscribe({
            next: (response) => {
                this.roles = response.roles.map(r => ({
                    value: r._id,
                    label: r.label
                }));
            },
            error: (error) => {
                console.error('Error loading roles:', error);
            }
        });
    }

    loadRolesByOrganization(organizationId: string): void {
        if (!organizationId) {
            this.loadRoles();
            return;
        }

        this.roleService.getRolesByOrganization(organizationId).subscribe({
            next: (response) => {
                this.roles = response.roles.map(r => ({
                    value: r._id,
                    label: r.label
                }));
            },
            error: (error) => {
                console.error('Error loading roles for organization:', error);
                // Fallback to loading all roles if organization-specific fetch fails
                this.loadRoles();
            }
        });
    }

    onRoleChange(roleId: string): void {
        // Organization field validation is handled by form logic
        // All roles can have organizations assigned
        const orgControl = this.userForm.get('organization');
        if (this.showOrganizationField) {
            orgControl?.setValidators([Validators.required]);
        } else {
            orgControl?.clearValidators();
        }
        orgControl?.updateValueAndValidity();
    }

    loadOrganizations(): void {
        // Only load organizations if user needs to see the organization dropdown
        // Organization Admins have their organization auto-filled and don't see the dropdown
        if (!this.showOrganizationField) {
            return;
        }

        this.organizationService.getOrganizations().subscribe({
            next: (response) => {
                this.organizations = response.organizations || [];
                // Call after organizations are loaded to ensure dropdown is populated
                this.handleOrganizationFieldByRole();
            },
            error: (error) => {
                console.error('Error loading organizations:', error);
            }
        });
    }

    fetchNextUserCode(): void {
        this.userService.getNextUserCode().subscribe({
            next: (response: any) => {
                this.userForm.patchValue({ code: response.code });
            },
            error: (error: any) => {
                console.error('Error fetching next user code:', error);
            }
        });
    }

    handleOrganizationFieldByRole(): void {
        const currentUser = this.authService.currentUserValue;
        if (!currentUser) return;

        const orgControl = this.userForm.get('organization');

        // If user doesn't have permission to view all organizations,
        // auto-select their organization and disable field
        if (!this.authService.hasPermission('organizations.read') && (currentUser as any).organization) {
            orgControl?.setValue((currentUser as any).organization);
            orgControl?.disable();
        }
    }

    checkEditMode(): void {
        this.userId = this.route.snapshot.paramMap.get('id');
        if (this.userId) {
            this.isEditMode = true;
            // Remove password requirement for edit mode
            this.userForm.get('password')?.clearValidators();
            this.userForm.get('password')?.updateValueAndValidity();
            this.loadUser();
        }
    }

    loadUser(): void {
        if (!this.userId) return;

        this.loading = true;
        this.userService.getUser(this.userId).subscribe({
            next: (response) => {
                if (response.user) {
                    const user = response.user;
                    // Split name into first and last name
                    const nameParts = user.name.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';

                    this.userForm.patchValue({
                        firstName: firstName,
                        lastName: lastName,
                        email: user.email,
                        mobile: user.mobile,
                        role: user.role,
                        organization: user.organization,
                        status: user.status
                    });
                }
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading user:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load user'
                }).then(() => {
                    this.router.navigate(['/users']);
                });
            }
        });
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.markFormGroupTouched(this.userForm);
            return;
        }

        this.submitting = true;
        // Use getRawValue() to include disabled fields
        const formData = this.userForm.getRawValue();

        // Combine firstName and lastName into name
        const userData = {
            ...formData,
            name: `${formData.firstName} ${formData.lastName}`.trim()
        };
        delete userData.firstName;
        delete userData.lastName;

        // Remove password if empty in edit mode
        if (this.isEditMode && !userData.password) {
            delete userData.password;
        }

        // Organization is optional for all roles now
        // Backend will handle organization assignment logic

        // Create FormData for file upload
        const formDataToSend = new FormData();
        Object.keys(userData).forEach(key => {
            if (userData[key] !== null && userData[key] !== undefined) {
                formDataToSend.append(key, userData[key]);
            }
        });

        // Add profile image if selected
        if (this.selectedFile) {
            formDataToSend.append('profileImage', this.selectedFile);
        }

        const request = this.isEditMode
            ? this.userService.updateUser(this.userId!, formDataToSend)
            : this.userService.createUser(formDataToSend);

        request.subscribe({
            next: (response) => {
                this.submitting = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: `User ${this.isEditMode ? 'updated' : 'created'} successfully`,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    this.router.navigate(['/users']);
                });
            },
            error: (error) => {
                console.error('Error saving user:', error);
                this.submitting = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} user`
                });
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/users']);
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
        const field = this.userForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.userForm.get(fieldName);
        if (field && field.invalid && (field.dirty || field.touched)) {
            if (field.errors?.['required']) return `${this.getFieldLabel(fieldName)} is required`;
            if (field.errors?.['email']) return 'Invalid email format';
            if (field.errors?.['minlength']) {
                const minLength = field.errors['minlength'].requiredLength;
                return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
            }
            if (field.errors?.['pattern']) {
                if (fieldName === 'mobile') return 'Mobile number must be exactly 10 digits';
                if (fieldName === 'firstName' || fieldName === 'lastName') return 'Name can only contain letters and spaces';
                return 'Invalid format';
            }
        }
        return '';
    }

    getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            'firstName': 'First Name',
            'lastName': 'Last Name',
            'email': 'Email',
            'mobile': 'Mobile',
            'password': 'Password',
            'role': 'Role',
            'organization': 'Organization',
            'status': 'Status'
        };
        return labels[fieldName] || fieldName;
    }

    onlyLettersAndSpaces(event: KeyboardEvent): boolean {
        const charCode = event.which || event.keyCode;
        const char = String.fromCharCode(charCode);
        // Allow letters (a-z, A-Z) and space
        if (!/^[a-zA-Z\s]$/.test(char)) {
            event.preventDefault();
            return false;
        }
        return true;
    }

    onlyNumbers(event: KeyboardEvent): boolean {
        const charCode = event.which || event.keyCode;
        const char = String.fromCharCode(charCode);
        // Allow only digits (0-9)
        if (!/^[0-9]$/.test(char)) {
            event.preventDefault();
            return false;
        }
        return true;
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid File Type',
                    text: 'Please select a valid image file (JPEG, JPG, PNG, GIF)'
                });
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                    icon: 'error',
                    title: 'File Too Large',
                    text: 'File size must be less than 5MB'
                });
                return;
            }

            this.selectedFile = file;

            // Create image preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    removeImage(): void {
        this.selectedFile = null;
        this.imagePreview = null;
        const fileInput = document.getElementById('profileImage') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }
}
