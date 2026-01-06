import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { GoalService } from '../../../services/goal.service';
import { GoalEntryService } from '../../../services/goal-entry.service';
import { AuthService } from '../../../services/auth.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-edit-lead',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
    templateUrl: './edit-lead.component.html',
    styleUrls: ['./edit-lead.component.css']
})
export class EditLeadComponent implements OnInit {
    leadForm!: FormGroup;
    goal: any = null;
    entry: any = null;
    entryId: string = '';
    loading = true;
    submitting = false;

    activities: any[] = [];
    newRemark: string = '';
    addingRemark: boolean = false;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private goalService: GoalService,
        private goalEntryService: GoalEntryService,
        private authService: AuthService,
        private breadcrumbService: BreadcrumbService
    ) { }

    ngOnInit(): void {
        this.entryId = this.route.snapshot.params['entryId'];
        this.loadEntry();
        this.loadActivities();
    }

    loadEntry(): void {
        this.loading = true;
        this.goalEntryService.getEntry(this.entryId).subscribe({
            next: (response) => {
                this.entry = response.entry;
                if (this.entry) {
                    const label = this.entry.data?.name || this.entry.code || 'Lead Details';
                    this.breadcrumbService.setLabel(this.entryId, label);
                }
                this.loadGoal(this.entry.goal._id || this.entry.goal);
            },
            error: (error) => {
                console.error('Error loading entry:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load lead details'
                }).then(() => {
                    this.router.navigate(['/leads']);
                });
            }
        });
    }

    loadActivities(): void {
        this.goalEntryService.getActivities(this.entryId).subscribe({
            next: (response) => {
                this.activities = response.activities;
            },
            error: (error) => {
                console.error('Error loading activities:', error);
            }
        });
    }

    loadGoal(goalId: string): void {
        this.goalService.getGoal(goalId).subscribe({
            next: (response) => {
                this.goal = response.goal;
                this.initializeForm();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading goal:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load goal details'
                });
            }
        });
    }

    initializeForm(): void {
        const formControls: any = {
            status: [this.entry.status || 'New', Validators.required]
        };

        // Add dynamic form fields with existing data
        if (this.goal.formSchema) {
            this.goal.formSchema.forEach((field: any) => {
                const validators = field.mandatory ? [Validators.required] : [];

                if (field.fieldType === 'email') {
                    validators.push(Validators.email);
                } else if (field.fieldType === 'phone') {
                    validators.push(Validators.pattern(/^[0-9]{10}$/));
                }

                const existingValue = this.entry.data?.[field.fieldName] || '';
                formControls[field.fieldName] = [existingValue, validators];
            });
        }

        formControls.contacts = this.fb.array([]);
        this.leadForm = this.fb.group(formControls);

        if (this.entry.contacts && this.entry.contacts.length > 0) {
            this.entry.contacts.forEach((contact: any) => {
                this.addContact(contact);
            });
        }
    }

    get contactsArray(): FormArray {
        return this.leadForm.get('contacts') as FormArray;
    }

    addContact(contactData?: any): void {
        const contactGroup = this.fb.group({
            name: [contactData?.name || '', Validators.required],
            designation: [contactData?.designation || ''],
            email: [contactData?.email || '', Validators.email],
            phone: [contactData?.phone || '']
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
                let formula = field.calculation;
                this.goal.formSchema.forEach((f: any) => {
                    const value = this.getFieldValue(f.fieldName) || 0;
                    formula = formula.replace(new RegExp(f.fieldName, 'g'), value.toString());
                });
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
        if (this.goal.formSchema) {
            this.goal.formSchema.forEach((f: any) => {
                if (f.fieldType === 'autoCalculate' && f.calculation?.includes(field.fieldName)) {
                    this.calculateAutoCalculate(f);
                }
            });
        }
    }

    submitRemark(): void {
        if (!this.newRemark.trim()) return;

        this.addingRemark = true;
        this.goalEntryService.addRemark(this.entryId, this.newRemark).subscribe({
            next: (response) => {
                this.addingRemark = false;
                this.entry.remarks = response.remarks;
                this.newRemark = '';
                this.loadActivities(); // Refresh activities
                Swal.fire({
                    icon: 'success',
                    title: 'Remark Added',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            error: (error) => {
                this.addingRemark = false;
                console.error('Error adding remark:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to add remark'
                });
            }
        });
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
        const data: any = {};
        if (this.goal.formSchema) {
            this.goal.formSchema.forEach((field: any) => {
                data[field.fieldName] = formValue[field.fieldName];
            });
        }

        const updateData = {
            data: data,
            status: formValue.status,
            contacts: formValue.contacts || []
        };

        this.submitting = true;
        this.goalEntryService.updateEntry(this.entryId, updateData).subscribe({
            next: (response) => {
                this.submitting = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Lead updated successfully',
                    timer: 2000,
                    showConfirmButton: false
                });
                this.router.navigate(['/leads']);
            },
            error: (error) => {
                this.submitting = false;
                console.error('Error updating lead:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || 'Failed to update lead'
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

    getStatusClass(status: string): string {
        if (!status) return 'status-new';
        const s = status.toLowerCase();
        if (s.includes('new') || s.includes('initiated')) return 'status-new';
        if (s.includes('won') || s.includes('happy') || s.includes('completed')) return 'status-won';
        if (s.includes('lost') || s.includes('rejected')) return 'status-lost';
        if (s.includes('process') || s.includes('progress') || s.includes('pending')) return 'status-process';
        return 'status-default';
    }
}
