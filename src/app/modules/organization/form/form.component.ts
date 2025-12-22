import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrganizationService } from '../../../services/organization.service';
import { LocationService } from '../../../services/location.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-organization-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
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

    constructor(
        private fb: FormBuilder,
        private organizationService: OrganizationService,
        private locationService: LocationService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.initializeForm();
        this.checkEditMode();
        this.initializeStates();
        this.setupAddressChangeListeners();

        // Fetch and pre-populate next org code for create mode
        if (!this.isEditMode) {
            this.fetchNextOrgCode();
        }
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
                    console.log('Location data loaded from API:', this.locationData);
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
            name: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z0-9\s]+$/)]],
            email: ['', [Validators.required, Validators.email]],
            website: ['', [Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)]],
            alias: [''],
            phone: [''],
            address: this.fb.group({
                street: [''],
                city: [''],
                state: [''],
                pincode: ['']
            }),
            logo: ['', [Validators.required]],
            description: [''],
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
            this.loadOrganization();
        }
    }

    loadOrganization(): void {
        if (!this.organizationId) return;

        this.loading = true;
        this.organizationService.getOrganization(this.organizationId).subscribe({
            next: (response) => {
                if (response.organization) {
                    const org = response.organization;

                    console.log('=== LOADING ORGANIZATION ===');
                    console.log('Full organization data:', org);
                    console.log('Address:', org.address);
                    console.log('State:', org.address?.state);
                    console.log('City:', org.address?.city);
                    console.log('Pincode:', org.address?.pincode);

                    // Pre-populate dropdowns based on existing address data
                    if (org.address?.state) {
                        console.log('Processing state:', org.address.state);

                        // Populate cities for the selected state
                        if (this.locationData[org.address.state]) {
                            this.cities = Object.keys(this.locationData[org.address.state]);
                            console.log('Cities populated:', this.cities);
                        } else {
                            console.warn('State not found in locationData:', org.address.state);
                        }

                        // Populate pincodes for the selected city
                        if (org.address.city && this.locationData[org.address.state]?.[org.address.city]) {
                            this.pincodes = this.locationData[org.address.state][org.address.city];
                            console.log('Pincodes populated:', this.pincodes);
                            console.log('Pincode to select:', org.address.pincode);
                            if (org.address.pincode) {
                                console.log('Is pincode in list?', this.pincodes.includes(org.address.pincode));
                            }
                            // Manually trigger change detection to update template
                            this.cdr.detectChanges();
                        } else {
                            console.warn('City not found in locationData:', org.address.city);
                        }
                    }

                    // Patch form values after populating dropdowns
                    // Use setTimeout to ensure dropdowns are rendered
                    setTimeout(() => {
                        console.log('=== PATCHING FORM ===' , org)
                        this.organizationForm.patchValue(org);
                        console.log('Form patched with values');
                        console.log('Current form address:', this.organizationForm.get('address')?.value);
                        console.log('Pincodes array:', this.pincodes);
                        this.organizationForm.patchValue({
                            address: {
                              state: org.address?.state || '',
                              city: org.address?.city || '',
                              pincode: org.address?.pincode || ''
                            }
                          });
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

    onLogoSelected(event: any): void {
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
        if (this.organizationForm.invalid) {
            this.markFormGroupTouched(this.organizationForm);
            return;
        }

        this.submitting = true;
        // Use getRawValue() to include disabled fields (like code)
        const formData = this.organizationForm.getRawValue();

        // Log form data to verify mobile number is included
        console.log('Form data being sent:', formData);
        console.log('Admin user mobile:', formData.adminUser?.mobile);

        const request = this.isEditMode
            ? this.organizationService.updateOrganization(this.organizationId!, formData)
            : this.organizationService.createOrganization(formData);

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

    onLogoChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.selectedLogoFile = input.files[0];
            // Update the form control with the file name or you can convert to base64
            this.organizationForm.patchValue({
                logo: this.selectedLogoFile.name
            });
        }
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
}
