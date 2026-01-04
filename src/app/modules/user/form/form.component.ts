import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService, User } from '../../../services/user.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
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
    roles: { value: string; label: string }[] = [];
    departments: string[] = [];
    statuses = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    // User type flags
    isSuperAdmin = false;
    isOrgAdmin = false;

    // Track if current user being edited has admin role
    isAdminRole = false;
    currentRoleLabel = '';

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private roleService: RoleService,
        private breadcrumbService: BreadcrumbService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.determineUserType();
        this.initializeForm();
        this.checkEditMode();
        this.loadDepartments();
    }

    determineUserType(): void {
        const currentUser = this.authService.currentUserValue;
        this.isSuperAdmin = this.authService.hasPermission('organizations.read');
        this.isOrgAdmin = !this.isSuperAdmin && !!currentUser?.organization;
    }

    initializeForm(): void {
        this.userForm = this.fb.group({
            code: [''],
            firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
            lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
            email: ['', [Validators.required, Validators.email]],
            mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
            role: ['', [Validators.required]],
            organization: [''],
            department: [''],
            status: ['active', [Validators.required]]
        });

        // Setup organization change listener for Super Admin
        if (this.isSuperAdmin) {
            this.userForm.get('organization')?.valueChanges.subscribe(orgId => {
                if (orgId && !this.isEditMode) {
                    this.onOrganizationSelected(orgId);
                }
            });
        }

        // Setup for Org Admin (auto-populate organization)
        if (this.isOrgAdmin && !this.isEditMode) {
            const user = this.authService.currentUserValue;
            if (user?.organization) {
                const orgId = typeof user.organization === 'object'
                    ? (user.organization as any)._id
                    : user.organization;

                this.userForm.patchValue({ organization: orgId }, { emitEvent: false });
                this.onOrganizationSelected(orgId);
            }
        }

        // Load organizations for Super Admin
        if (this.isSuperAdmin) {
            this.loadOrganizations();
        }
    }

    onOrganizationSelected(organizationId: string): void {
        // Load roles for the selected organization
        this.loadRolesForOrganization(organizationId);

        // Load departments for the organization
        this.loadDepartments(organizationId);

        // Generate user code for the organization
        this.generateUserCode(organizationId);
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

    loadRolesForOrganization(organizationId: string, onComplete?: () => void): void {
        this.roleService.getRolesByOrganization(organizationId).subscribe({
            next: (response) => {
                let roles = response.roles || [];

                // Filter out admin roles for non-super-admin users
                if (!this.isSuperAdmin) {
                    roles = roles.filter(r => r.name !== 'super_admin' && r.name !== 'org_admin');
                }

                this.roles = roles.map(r => ({
                    value: r._id,
                    label: r.label
                }));

                this.cdr.markForCheck();

                // Execute callback if provided
                if (onComplete) {
                    onComplete();
                }
            },
            error: (error) => {
                console.error('Error loading roles:', error);
                this.roles = [];
            }
        });
    }

    loadDepartments(organizationId?: string): void {
        if (!organizationId) {
            this.departments = [];
            return;
        }

        this.organizationService.getOrganization(organizationId).subscribe({
            next: (response) => {
                if (response.success && response.organization) {
                    this.departments = response.organization.departments || [];
                } else {
                    this.departments = [];
                }
            },
            error: (error) => {
                console.error('Error loading departments:', error);
                this.departments = [];
            }
        });
    }

    generateUserCode(organizationId?: string): void {
        this.userService.getNextUserCode(organizationId).subscribe({
            next: (response: any) => {
                this.userForm.patchValue({ code: response.code });
            },
            error: (error: any) => {
                console.error('Error fetching user code:', error);
            }
        });
    }

    checkEditMode(): void {
        this.userId = this.route.snapshot.paramMap.get('id');
        if (this.userId) {
            this.isEditMode = true;
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
                    const nameParts = user.name.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';

                    const roleId = typeof user.role === 'object' && user.role ? (user.role as any)._id : user.role;
                    const orgId = typeof user.organization === 'object' && user.organization ? (user.organization as any)._id : user.organization;

                    // Patch basic fields
                    this.userForm.patchValue({
                        code: user.code,
                        firstName: firstName,
                        lastName: lastName,
                        email: user.email,
                        mobile: user.mobile,
                        organization: orgId,
                        department: user.department || '',
                        status: user.status
                    });

                    // Load roles for the user's organization, then set role
                    if (orgId) {
                        this.loadRolesForOrganization(orgId, () => {
                            // Set role after roles are loaded and UI updated
                            this.cdr.detectChanges();
                            setTimeout(() => {
                                this.userForm.patchValue({ role: roleId });
                                this.cdr.markForCheck();
                            });

                            // Check if role should be disabled (admin roles)
                            if (user.role && typeof user.role === 'object') {
                                const roleName = (user.role as any).name;
                                const roleLabel = (user.role as any).label;
                                if (roleName === 'super_admin' || roleName === 'org_admin') {
                                    this.isAdminRole = true;
                                    this.currentRoleLabel = roleLabel;
                                    this.userForm.get('role')?.disable();
                                }
                            }
                        });

                        // Load departments for the user's organization
                        this.loadDepartments(orgId);
                    }

                    // Set dynamic breadcrumb label
                    if (user.code && this.userId) {
                        this.breadcrumbService.setLabel(this.userId, user.code);
                    }

                    // Disable organization field in edit mode
                    this.userForm.get('organization')?.disable();
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
        const formData = this.userForm.getRawValue();

        const userData = {
            ...formData,
            name: `${formData.firstName} ${formData.lastName}`.trim()
        };
        delete userData.firstName;
        delete userData.lastName;

        const formDataToSend = new FormData();
        Object.keys(userData).forEach(key => {
            if (userData[key] !== null && userData[key] !== undefined) {
                formDataToSend.append(key, userData[key]);
            }
        });

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
            'department': 'Department',
            'role': 'Role',
            'organization': 'Organization',
            'status': 'Status'
        };
        return labels[fieldName] || fieldName;
    }

    onlyLettersAndSpaces(event: KeyboardEvent): boolean {
        const charCode = event.which || event.keyCode;
        const char = String.fromCharCode(charCode);
        if (!/^[a-zA-Z\s]$/.test(char)) {
            event.preventDefault();
            return false;
        }
        return true;
    }

    onlyNumbers(event: KeyboardEvent): boolean {
        const charCode = event.which || event.keyCode;
        const char = String.fromCharCode(charCode);
        if (!/^[0-9]$/.test(char)) {
            event.preventDefault();
            return false;
        }
        return true;
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid File Type',
                    text: 'Please select a valid image file (JPEG, JPG, PNG, GIF)'
                });
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                    icon: 'error',
                    title: 'File Too Large',
                    text: 'File size must be less than 5MB'
                });
                return;
            }

            this.selectedFile = file;

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

    ngOnDestroy(): void {
        // Clear dynamic breadcrumb when leaving
        if (this.userId) {
            this.breadcrumbService.clear(this.userId);
        }
    }
}
