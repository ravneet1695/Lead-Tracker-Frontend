import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { GoalService } from '../../../services/goal.service';
import { GroupService } from '../../../services/group.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

interface FormField {
    fieldName: string;
    fieldType: string;
    alias: string;
    mandatory: boolean;
    options?: string[];
    calculation?: string;
    maxContacts?: number;
    order: number;
}

@Component({
    selector: 'app-goal-create',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
    templateUrl: './create.component.html',
    styleUrls: ['./create.component.css']
})
export class GoalCreateComponent implements OnInit {
    goalForm!: FormGroup;
    groups: any[] = [];
    formFields: FormField[] = [];
    selectedFieldIndex: number | null = null;
    loading = false;
    submitting = false;

    fieldTypes = [
        { value: 'text', label: 'Text', icon: '📝' },
        { value: 'number', label: 'Number', icon: '🔢' },
        { value: 'date', label: 'Date', icon: '📅' },
        { value: 'dropdown', label: 'Dropdown', icon: '📋' },
        { value: 'email', label: 'Email', icon: '📧' },
        { value: 'phone', label: 'Phone', icon: '📞' },
        { value: 'textarea', label: 'Text Area', icon: '📄' },
        { value: 'multiContact', label: 'Multi Contact', icon: '👥' },
        { value: 'autoNumber', label: 'Auto Number', icon: '#️⃣' },
        { value: 'autoCalculate', label: 'Auto Calculate', icon: '🧮' }
    ];

    statusOptions: string[] = ['New', 'In Progress', 'Completed', 'Cancelled'];
    customStatusInput = '';

    constructor(
        private fb: FormBuilder,
        private goalService: GoalService,
        private groupService: GroupService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.initializeForm();
        this.loadGroups();
    }

    initializeForm(): void {
        this.goalForm = this.fb.group({
            title: ['', [Validators.required, Validators.minLength(3)]],
            description: [''],
            target: [null],
            completionStatus: ['Approved'], // Status that indicates lead counts toward goal
            startDate: [''],
            endDate: [''],
            status: ['active'],
            groups: [[], Validators.required],
            pointsEntryCreation: [10],
            pointsStatusUpdate: [5],
            pointsFieldCompletion: [2]
        });
    }

    loadGroups(): void {
        this.loading = true;
        this.groupService.getGroups().subscribe({
            next: (response) => {
                this.groups = response.groups || [];
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading groups:', error);
                this.loading = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load groups'
                });
            }
        });
    }

    // Group Selection Methods
    toggleGroupSelection(groupId: string): void {
        const selectedGroups = this.goalForm.get('groups')?.value || [];
        const index = selectedGroups.indexOf(groupId);

        if (index > -1) {
            selectedGroups.splice(index, 1);
        } else {
            selectedGroups.push(groupId);
        }

        this.goalForm.patchValue({ groups: selectedGroups });
    }

    isGroupSelected(groupId: string): boolean {
        const selectedGroups = this.goalForm.get('groups')?.value || [];
        return selectedGroups.includes(groupId);
    }

    getSelectedGroupsCount(): number {
        return (this.goalForm.get('groups')?.value || []).length;
    }

    // Form Field Builder Methods
    addFormField(fieldType: string): void {
        const newField: FormField = {
            fieldName: `field_${this.formFields.length + 1}`,
            fieldType: fieldType,
            alias: `Field ${this.formFields.length + 1}`,
            mandatory: false,
            order: this.formFields.length,
            ...(fieldType === 'dropdown' && { options: [] }),
            ...(fieldType === 'multiContact' && { maxContacts: 5 }),
            ...(fieldType === 'autoCalculate' && { calculation: '' })
        };

        this.formFields.push(newField);
        this.selectedFieldIndex = this.formFields.length - 1;
    }

    selectField(index: number): void {
        this.selectedFieldIndex = index;
    }

    deleteField(index: number): void {
        Swal.fire({
            title: 'Delete Field?',
            text: 'Are you sure you want to delete this field?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.formFields.splice(index, 1);
                // Update order for remaining fields
                this.formFields.forEach((field, idx) => {
                    field.order = idx;
                });
                if (this.selectedFieldIndex === index) {
                    this.selectedFieldIndex = null;
                }
            }
        });
    }

    moveFieldUp(index: number): void {
        if (index > 0) {
            const temp = this.formFields[index];
            this.formFields[index] = this.formFields[index - 1];
            this.formFields[index - 1] = temp;
            // Update order
            this.formFields.forEach((field, idx) => {
                field.order = idx;
            });
        }
    }

    moveFieldDown(index: number): void {
        if (index < this.formFields.length - 1) {
            const temp = this.formFields[index];
            this.formFields[index] = this.formFields[index + 1];
            this.formFields[index + 1] = temp;
            // Update order
            this.formFields.forEach((field, idx) => {
                field.order = idx;
            });
        }
    }

    updateFieldName(index: number, value: string): void {
        // Convert to snake_case
        const fieldName = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        this.formFields[index].fieldName = fieldName || `field_${index + 1}`;
    }

    // Dropdown Options Methods
    addOption(index: number): void {
        const field = this.formFields[index];
        if (!field.options) {
            field.options = [];
        }
        field.options.push('');
    }

    removeOption(fieldIndex: number, optionIndex: number): void {
        const field = this.formFields[fieldIndex];
        if (field.options) {
            field.options.splice(optionIndex, 1);
        }
    }

    updateOption(fieldIndex: number, optionIndex: number, value: string): void {
        const field = this.formFields[fieldIndex];
        if (field.options) {
            field.options[optionIndex] = value;
        }
    }

    // Status Options Methods
    addStatusOption(): void {
        if (this.customStatusInput.trim()) {
            if (!this.statusOptions.includes(this.customStatusInput.trim())) {
                this.statusOptions.push(this.customStatusInput.trim());
                this.customStatusInput = '';
            }
        }
    }

    removeStatusOption(index: number): void {
        this.statusOptions.splice(index, 1);
    }

    // Form Submission
    onSubmit(): void {
        if (this.goalForm.invalid) {
            Object.keys(this.goalForm.controls).forEach(key => {
                const control = this.goalForm.get(key);
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

        const formValue = this.goalForm.value;

        const goalData = {
            title: formValue.title,
            description: formValue.description,
            target: formValue.target,
            completionStatus: formValue.completionStatus || 'Approved',
            timeline: {
                startDate: formValue.startDate || null,
                endDate: formValue.endDate || null
            },
            groups: formValue.groups,
            formSchema: this.formFields,
            statusOptions: this.statusOptions,
            pointsConfig: {
                entryCreation: formValue.pointsEntryCreation,
                statusUpdate: formValue.pointsStatusUpdate,
                fieldCompletion: formValue.pointsFieldCompletion
            },
            status: formValue.status
        };

        this.submitting = true;
        this.goalService.createGoal(goalData).subscribe({
            next: (response) => {
                this.submitting = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Goal created successfully',
                    timer: 2000,
                    showConfirmButton: false
                });
                this.router.navigate(['/goals/manage']);
            },
            error: (error) => {
                this.submitting = false;
                console.error('Error creating goal:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error?.message || 'Failed to create goal'
                });
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/goals/manage']);
    }

    getFieldTypeIcon(fieldType: string): string {
        return this.fieldTypes.find(ft => ft.value === fieldType)?.icon || '📝';
    }

    getFieldTypeLabel(fieldType: string): string {
        return this.fieldTypes.find(ft => ft.value === fieldType)?.label || fieldType;
    }
}
