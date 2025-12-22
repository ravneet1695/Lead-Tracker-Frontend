import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { GoalService } from '../../../services/goal.service';
import { GoalEntryService } from '../../../services/goal-entry.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-create-lead',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
    templateUrl: './create-lead.component.html',
    styleUrls: ['./create-lead.component.css']
})
export class CreateLeadComponent implements OnInit {
    leadForm!: FormGroup;
    goal: any = null;
    goalId: string = '';
    loading = true;
    submitting = false;
    userGroups: any[] = [];
    selectedGroup: string = '';
    autoNumberCounters: { [key: string]: number } = {};

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private goalService: GoalService,
        private goalEntryService: GoalEntryService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.goalId = this.route.snapshot.params['goalId'];
        this.loadGoal();
    }

    loadGoal(): void {
        this.loading = true;
        this.goalService.getGoal(this.goalId).subscribe({
            next: (response) => {
                this.goal = response.goal;
                this.filterUserGroups();
                this.initializeForm();
                this.initializeAutoNumbers();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading goal:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load goal details'
                }).then(() => {
                    this.router.navigate(['/leads']);
                });
            }
        });
    }

    filterUserGroups(): void {
        const currentUser = this.authService.currentUserValue;
        if (currentUser && currentUser.groups && this.goal.groups) {
            const goalGroupIds = this.goal.groups.map((g: any) => g._id || g);
            this.userGroups = currentUser.groups.filter((userGroup: any) =>
                goalGroupIds.includes(userGroup._id || userGroup)
            );

            // DEVELOPMENT MODE: If user has no matching groups, use all goal groups
            // This allows testing without proper group assignments
            if (this.userGroups.length === 0) {
                console.warn('User not assigned to goal groups - using all goal groups for development');
                this.userGroups = this.goal.groups;
            }

            if (this.userGroups.length === 1) {
                this.selectedGroup = this.userGroups[0]._id || this.userGroups[0];
            }
        } else if (this.goal.groups) {
            // If user has no groups at all, use all goal groups
            console.warn('User has no groups - using all goal groups for development');
            this.userGroups = this.goal.groups;
            if (this.userGroups.length === 1) {
                this.selectedGroup = this.userGroups[0]._id || this.userGroups[0];
            }
        }
    }

    initializeForm(): void {
        const formControls: any = {
            group: [this.selectedGroup, Validators.required],
            status: [this.goal.statusOptions?.[0] || 'New', Validators.required],
            remarks: ['']
        };

        // Add dynamic form fields
        if (this.goal.formSchema) {
            this.goal.formSchema.forEach((field: any) => {
                const validators = field.mandatory ? [Validators.required] : [];

                // Add specific validators based on field type
                if (field.fieldType === 'email') {
                    validators.push(Validators.email);
                } else if (field.fieldType === 'phone') {
                    validators.push(Validators.pattern(/^[0-9]{10}$/));
                }

                formControls[field.fieldName] = ['', validators];
            });
        }

        // Add contacts array
        formControls.contacts = this.fb.array([]);

        this.leadForm = this.fb.group(formControls);
    }

    initializeAutoNumbers(): void {
        if (this.goal.formSchema) {
            this.goal.formSchema.forEach((field: any) => {
                if (field.fieldType === 'autoNumber') {
                    this.autoNumberCounters[field.fieldName] = 1;
                    this.leadForm.patchValue({
                        [field.fieldName]: this.autoNumberCounters[field.fieldName]
                    });
                }
            });
        }
    }

    get contactsArray(): FormArray {
        return this.leadForm.get('contacts') as FormArray;
    }

    addContact(): void {
        const contactGroup = this.fb.group({
            name: ['', Validators.required],
            designation: [''],
            email: ['', Validators.email],
            phone: ['']
        });
        this.contactsArray.push(contactGroup);
    }

    removeContact(index: number): void {
        this.contactsArray.removeAt(index);
    }

    getFieldValue(fieldName: string): any {
        return this.leadForm.get(fieldName)?.value;
    }

    calculateAutoCalculate(field: any): void {
        if (field.calculation) {
            try {
                // Simple calculation - replace field names with values
                let formula = field.calculation;

                this.goal.formSchema.forEach((f: any) => {
                    const value = this.getFieldValue(f.fieldName) || 0;
                    formula = formula.replace(new RegExp(f.fieldName, 'g'), value.toString());
                });

                // Use Function constructor instead of eval for safer evaluation
                // Only allow basic math operations
                const safeFormula = formula.replace(/[^0-9+\-*/().\s]/g, '');
                const calculate = new Function('return ' + safeFormula);
                const result = calculate();

                this.leadForm.patchValue({
                    [field.fieldName]: result
                });
            } catch (error) {
                console.error('Error calculating field:', error);
            }
        }
    }

    onFieldChange(field: any): void {
        // Trigger auto-calculate fields when dependencies change
        if (this.goal.formSchema) {
            this.goal.formSchema.forEach((f: any) => {
                if (f.fieldType === 'autoCalculate' && f.calculation?.includes(field.fieldName)) {
                    this.calculateAutoCalculate(f);
                }
            });
        }
    }

    onSubmit(): void {
        if (this.leadForm.invalid) {
            Object.keys(this.leadForm.controls).forEach(key => {
                const control = this.leadForm.get(key);
                if (control?.invalid) {
                    control.markAsTouched();
                }
            });

            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please fill in all required fields correctly'
            });
            return;
        }

        const formValue = this.leadForm.value;

        // Build data object from form schema fields
        const data: any = {};
        if (this.goal.formSchema) {
            this.goal.formSchema.forEach((field: any) => {
                data[field.fieldName] = formValue[field.fieldName];
            });
        }

        const entryData = {
            goal: this.goalId,
            group: formValue.group,
            data: data,
            status: formValue.status,
            contacts: formValue.contacts || [],
            remarks: formValue.remarks
        };

        this.submitting = true;
        this.goalEntryService.createEntry(entryData).subscribe({
            next: (response) => {
                this.submitting = false;

                if (response.goalCompleted) {
                    // Show celebration for goal completion
                    Swal.fire({
                        icon: 'success',
                        title: '🎉 Congratulations!',
                        html: `
                            <p style="font-size: 1.1rem; margin-bottom: 10px;">${response.message}</p>
                            <p style="color: #10b981; font-weight: 600; font-size: 1.2rem;">
                                +${response.bonusPoints} Bonus Points! 🏆
                            </p>
                        `,
                        timer: 4000,
                        showConfirmButton: true,
                        confirmButtonText: 'Awesome!'
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: response.message || 'Lead created successfully',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }

                this.router.navigate(['/leads']);
            },
            error: (error) => {
                this.submitting = false;
                console.error('Error creating lead:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || 'Failed to create lead'
                });
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/leads']);
    }

    getFieldTypeIcon(fieldType: string): string {
        const icons: any = {
            'text': '📝',
            'number': '🔢',
            'date': '📅',
            'dropdown': '📋',
            'email': '📧',
            'phone': '📞',
            'textarea': '📄',
            'multiContact': '👥',
            'autoNumber': '#️⃣',
            'autoCalculate': '🧮'
        };
        return icons[fieldType] || '📝';
    }
}
