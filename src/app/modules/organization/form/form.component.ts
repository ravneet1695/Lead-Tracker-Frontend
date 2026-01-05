import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrganizationService } from '../../../services/organization.service';
import { LocationService } from '../../../services/location.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-organization-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.css']
})
export class OrganizationFormComponent implements OnInit {
    organizationForm!: FormGroup;
    isEditMode = false;
    organizationId: string | null = null;
    loading = false;
    submitting = false;

    // Location data for dependent dropdowns
    states: string[] = [];
    cities: string[] = [];
    pincodes: string[] = [];
    private locationData: any = {}; // Will be loaded from API

    // File upload
    selectedLogoFile: File | null = null;
    selectedAdminProfileFile: File | null = null;
    departments: string[] = [];
    customDepartmentInput: string = '';

    constructor(
        private fb: FormBuilder,
        private organizationService: OrganizationService,
        private locationService: LocationService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        // Check edit mode FIRST before initializing form
        this.checkEditMode();
        this.initializeForm();
        this.initializeStates();
        this.setupAddressChangeListeners();

        // Fetch and pre-populate next org code for create mode
        if (!this.isEditMode) {
            this.fetchNextOrgCode();
        }
        // Note: In edit mode, loadOrganization() is called after location data loads
    }

    fetchNextOrgCode(): void {
        this.organizationService.getNextCode().subscribe({
            next: (response) => {
                this.organizationForm.patchValue({
                    code: response.code
                });
            },
            error: (error) => {
                console.error('Error fetching next org code:', error);
            }
        });
    }

    initializeStates(): void {
        // Fetch all location data from API
        this.locationService.getAllLocationData().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.locationData = response.data;
                    this.states = Object.keys(this.locationData);

                    // If in edit mode, load organization data after location data is ready
                    if (this.isEditMode && this.organizationId) {
                        this.loadOrganization();
                    }
                }
            },
            error: (error) => {
                console.error('Error loading location data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load location data. Please refresh the page.'
                });
            }
        });
    }

    setupAddressChangeListeners(): void {
        // Listen to state changes
        this.organizationForm.get('address.state')?.valueChanges.subscribe(state => {
            this.onStateChange(state);
        });

        // Listen to city changes
        this.organizationForm.get('address.city')?.valueChanges.subscribe(city => {
            this.onCityChange(city);
        });
    }

    onStateChange(state: string): void {
        if (state && this.locationData[state]) {
            this.cities = Object.keys(this.locationData[state]);
            this.pincodes = [];

            // Only reset city and pincode if not in edit mode or if user is manually changing
            // (not during initial form load)
            const currentCity = this.organizationForm.get('address.city')?.value;
            const currentPincode = this.organizationForm.get('address.pincode')?.value;

            // If city is not valid for new state, reset it
            if (currentCity && !this.cities.includes(currentCity)) {
                this.organizationForm.patchValue({
                    address: {
                        city: '',
                        pincode: ''
                    }
                }, { emitEvent: false });
            }
        } else {
            this.cities = [];
            this.pincodes = [];
        }
    }

    onCityChange(city: string): void {
        const state = this.organizationForm.get('address.state')?.value;
        if (state && city && this.locationData[state] && this.locationData[state][city]) {
            this.pincodes = this.locationData[state][city];

            // Only reset pincode if current pincode is not valid for this city
            const currentPincode = this.organizationForm.get('address.pincode')?.value;
            if (currentPincode && !this.pincodes.includes(currentPincode)) {
                this.organizationForm.patchValue({
                    address: {
                        pincode: ''
                    }
                }, { emitEvent: false });
            }
        } else {
            this.pincodes = [];
        }
    }

    initializeForm(): void {
        this.organizationForm = this.fb.group({
            code: [{ value: '', disabled: true }], // Auto-generated, always disabled
            name: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z0-9\s&\-\.,]+$/)]],
            email: ['', [Validators.required, Validators.email]],
            website: ['', [Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)]],
            alias: [''],
            address: this.fb.group({
                street: [''],
                city: ['', [Validators.required]],
                state: ['', [Validators.required]],
                pincode: ['', [Validators.required]]
            }),
            logo: ['', this.isEditMode ? [] : [Validators.required]],
            description: [''],
            departments: [[]],
            // Admin user fields (only for create mode)
            adminUser: this.fb.group({
                name: ['', this.isEditMode ? [] : [Validators.required]],
                email: ['', this.isEditMode ? [] : [Validators.required, Validators.email]],
                mobile: ['', this.isEditMode ? [] : [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
                password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(8)]],
                confirmPassword: ['', this.isEditMode ? [] : [Validators.required]]
            }, { validators: this.isEditMode ? null : this.passwordMatchValidator })
        });
    }

    // Custom validator for password confirmation
    passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordMismatch: true };
    }

    checkEditMode(): void {
        this.organizationId = this.route.snapshot.paramMap.get('id');
        if (this.organizationId) {
            this.isEditMode = true;
            // Don't load organization here - will be called after form init
        }
    }

    loadOrganization(): void {
        if (!this.organizationId) return;

        this.loading = true;
        this.organizationService.getOrganization(this.organizationId).subscribe({
            next: (response) => {
                if (response.organization) {
                    const org = response.organization;

                    // Pre-populate dropdowns based on existing address data
                    if (org.address?.state) {
                        // Populate cities for the selected state
                        if (this.locationData[org.address.state]) {
                            this.cities = Object.keys(this.locationData[org.address.state]);
                        }

                        // Populate pincodes for the selected city
                        if (org.address.city && this.locationData[org.address.state]?.[org.address.city]) {
                            this.pincodes = this.locationData[org.address.state][org.address.city];
                            // Manually trigger change detection to update template
                            this.cdr.detectChanges();
                        }
                    }

                    // Patch form values after populating dropdowns
                    // Use setTimeout to ensure dropdowns are rendered
                    setTimeout(() => {
                        console.log('Patching organization data:', org);
                        this.organizationForm.patchValue({
                            code: org.code || '',
                            name: org.name || '',
                            email: org.email || '',
                            website: org.website || '',
                            alias: org.alias || '',
                            logo: org.logo || '',
                            description: org.description || '',
                            address: {
                                state: org.address?.state || '',
                                city: org.address?.city || '',
                                pincode: org.address?.pincode || '',
                                street: org.address?.street || ''
                            },
                            departments: org.departments || []
                        });
                        this.departments = org.departments || [];
                        console.log('Form values after patch:', this.organizationForm.value);
                    }, 100);
                }
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading organization:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load organization'
                }).then(() => {
                    this.router.navigate(['/organizations']);
                });
            }
        });
    }

    onLogoChange(event: any): void {
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

            this.selectedLogoFile = file;
            // Update the form control value so the form becomes valid
            const logoControl = this.organizationForm.get('logo');
            if (logoControl) {
                logoControl.setValue(file.name);
                logoControl.markAsDirty();
                logoControl.markAsTouched();
            }
        }
    }

    onAdminProfileSelected(event: any): void {
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

            this.selectedAdminProfileFile = file;
        }
    }

    removeAdminProfile(): void {
        this.selectedAdminProfileFile = null;
        const fileInput = document.getElementById('adminProfileImage') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    onSubmit(): void {
        console.log('Form submission started. Edit mode:', this.isEditMode);
        console.log('Form valid:', this.organizationForm.valid);

        if (this.organizationForm.invalid) {
            console.log('Form is invalid. Errors:', this.organizationForm.errors);
            console.log('Logo field errors:', this.organizationForm.get('logo')?.errors);
            this.markFormGroupTouched(this.organizationForm);
            return;
        }

        this.submitting = true;

        const formData = this.organizationForm.getRawValue();

        // Prepare data based on mode
        let dataToSend;
        if (this.isEditMode) {
            // Exclude adminUser for updates - backend doesn't expect it
            const { adminUser, ...orgData } = formData;
            dataToSend = orgData;
        } else {
            // Include everything for creation
            dataToSend = formData;
        }
        console.log(`${this.isEditMode ? 'Update' : 'Create'} payload:`, dataToSend);

        const request = this.isEditMode
            ? this.organizationService.updateOrganization(this.organizationId!, dataToSend)
            : this.organizationService.createOrganization(dataToSend);

        request.subscribe({
            next: (response) => {
                this.submitting = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: response.message || `Organization ${this.isEditMode ? 'updated' : 'created'} successfully`,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    this.router.navigate(['/organizations']);
                });
            },
            error: (error) => {
                console.error('Error saving organization:', error);
                this.submitting = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} organization`
                });
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/organizations']);
    }

    clearSelectedFile(): void {
        this.selectedLogoFile = null;
        this.organizationForm.patchValue({
            logo: ''
        });
        // Reset the file input
        const fileInput = document.getElementById('logo') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
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
        const field = this.organizationForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.organizationForm.get(fieldName);
        if (field?.errors) {
            if (field.errors['required']) return 'This field is required';
            if (field.errors['email']) return 'Please enter a valid email';
            if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
            if (field.errors['pattern']) {
                if (fieldName === 'name') return 'Organization name can only contain letters, numbers, and spaces';
                if (fieldName === 'adminUser.mobile') return 'Mobile number must be exactly 10 digits';
                return 'Invalid format';
            }
        }
        return '';
    }

    addDepartment(): void {
        const value = this.customDepartmentInput.trim();
        if (value && !this.departments.includes(value)) {
            this.departments.push(value);
            this.organizationForm.get('departments')?.patchValue(this.departments);
            this.customDepartmentInput = '';
        } else if (this.departments.includes(value)) {
            Swal.fire({
                icon: 'warning',
                title: 'Duplicate Department',
                text: 'This department already exists.'
            });
        }
    }

    removeDepartment(index: number): void {
        this.departments.splice(index, 1);
        this.organizationForm.get('departments')?.patchValue(this.departments);
    }

    onlyNumbers(event: any): boolean {
        const charCode = (event.which) ? event.which : event.keyCode;
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            return false;
        }
        return true;
    }
}
