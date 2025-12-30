import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { GoalService } from '../../../services/goal.service';
import { GroupService } from '../../../services/group.service';
import { OrganizationService } from '../../../services/organization.service';
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
    // FormArray properties
    isArrayField?: boolean;
    displayMode?: 'cards' | 'table';
    columnCount?: number;
    arrayFields?: ArraySubField[];
    minInstances?: number;
    maxInstances?: number;
}

interface ArraySubField {
    fieldName: string;
    fieldType: string;
    alias: string;
    mandatory: boolean;
    options?: string[];
    order: number;
    columnIndex?: number;
    dependsOn?: {
        fieldName: string;
        mappings: Array<{
            when: string;
            then: {
                label?: string;
                options?: string[];
                defaultValue?: any;
                show?: boolean;
            }
        }>;
    };
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
    organizations: any[] = [];
    formFields: FormField[] = [];
    selectedFieldIndex: number | null = null;
    selectedColumn: number = 0;  // Track selected column for table mode
    loading = false;
    submitting = false;
    isSuperAdmin = false;

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
        { value: 'autoCalculate', label: 'Auto Calculate', icon: '🧮' },
        { value: 'formArray', label: 'Repeatable Group', icon: '🔁' }
    ];

    statusOptions: string[] = ['New', 'In Progress', 'Completed', 'Cancelled'];
    customStatusInput = '';

    constructor(
        private fb: FormBuilder,
        private goalService: GoalService,
        private groupService: GroupService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.checkUserRole();
        this.initializeForm();
        this.loadOrganizations();
        this.loadGroups();
    }

    checkUserRole(): void {
        this.isSuperAdmin = this.authService.hasPermission('organizations.read');
    }

    initializeForm(): void {
        this.goalForm = this.fb.group({
            organization: [''],
            title: ['', [Validators.required, Validators.minLength(3)]],
            completionStatus: ['Approved'], // Status that indicates lead counts toward goal
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
            groups: [[], Validators.required]
        });

        // Make organization required for Super Admins
        if (this.isSuperAdmin) {
            this.goalForm.get('organization')?.setValidators([Validators.required]);
        }
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
            ...(fieldType === 'autoCalculate' && { calculation: '' }),
            ...(fieldType === 'formArray' && {
                isArrayField: true,
                displayMode: 'table',
                columnCount: 2,
                arrayFields: [],
                minInstances: 1,
                maxInstances: 10
            })
        };

        this.formFields.push(newField);
        this.selectedFieldIndex = this.formFields.length - 1;
        this.selectedColumn = 0;  // Reset selected column
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

    // FormArray Management Methods
    addFieldToArray(arrayFieldIndex: number, fieldType: string): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) {
            arrayField.arrayFields = [];
        }

        const newField: FormField = {
            fieldName: `subfield_${arrayField.arrayFields.length + 1}`,
            fieldType: fieldType,
            alias: `Sub Field ${arrayField.arrayFields.length + 1}`,
            mandatory: false,
            order: arrayField.arrayFields.length,
            ...(fieldType === 'dropdown' && { options: [] })
        };

        arrayField.arrayFields.push(newField);
    }

    removeFieldFromArray(arrayFieldIndex: number, subfieldIndex: number): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (arrayField.arrayFields) {
            arrayField.arrayFields.splice(subfieldIndex, 1);
            // Update order
            arrayField.arrayFields.forEach((field, idx) => {
                field.order = idx;
            });
        }
    }

    updateArraySubfieldAlias(arrayFieldIndex: number, subfieldIndex: number, value: string): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (arrayField.arrayFields && arrayField.arrayFields[subfieldIndex]) {
            arrayField.arrayFields[subfieldIndex].alias = value;
            // Auto-generate field name from alias
            const fieldName = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            arrayField.arrayFields[subfieldIndex].fieldName = fieldName || `subfield_${subfieldIndex + 1}`;
        }
    }

    updateArraySubfieldMandatory(arrayFieldIndex: number, subfieldIndex: number, value: boolean): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (arrayField.arrayFields && arrayField.arrayFields[subfieldIndex]) {
            arrayField.arrayFields[subfieldIndex].mandatory = value;
        }
    }

    // Column and Dependency Management Methods
    getColumnArray(count: number): number[] {
        return Array.from({ length: count }, (_, i) => i);
    }

    addFieldToArrayColumn(arrayFieldIndex: number, columnIndex: number, fieldType: string): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) {
            arrayField.arrayFields = [];
        }

        const newField: ArraySubField = {
            fieldName: `col${columnIndex}_field_${arrayField.arrayFields.length + 1}`,
            fieldType: fieldType,
            alias: `Column ${columnIndex + 1} Field`,
            mandatory: false,
            order: arrayField.arrayFields.length,
            columnIndex: columnIndex,
            ...(fieldType === 'dropdown' && { options: [] })
        };

        arrayField.arrayFields.push(newField);
    }

    getFieldsInColumn(arrayFieldIndex: number, columnIndex: number): ArraySubField[] {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) return [];
        return arrayField.arrayFields.filter(f => (f.columnIndex || 0) === columnIndex);
    }

    canHaveDependency(subfield: ArraySubField): boolean {
        // Only certain field types can have dependencies
        return ['text', 'number', 'dropdown', 'email', 'phone'].includes(subfield.fieldType);
    }

    toggleDependency(arrayFieldIndex: number, subfieldIndex: number): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) return;

        const subfield = arrayField.arrayFields[subfieldIndex];
        if (subfield.dependsOn) {
            delete subfield.dependsOn;
        } else {
            subfield.dependsOn = {
                fieldName: '',
                mappings: []
            };
        }
    }

    getPreviousFields(arrayFieldIndex: number, subfieldIndex: number): ArraySubField[] {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) return [];

        // Return fields that come before this one (can be depended upon)
        return arrayField.arrayFields.slice(0, subfieldIndex);
    }

    addDependencyMapping(arrayFieldIndex: number, subfieldIndex: number): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) return;

        const subfield = arrayField.arrayFields[subfieldIndex];
        if (!subfield.dependsOn) return;

        subfield.dependsOn.mappings.push({
            when: '',
            then: {
                label: '',
                options: [],
                show: true
            }
        });
    }

    removeMapping(arrayFieldIndex: number, subfieldIndex: number, mappingIndex: number): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) return;

        const subfield = arrayField.arrayFields[subfieldIndex];
        if (!subfield.dependsOn) return;

        subfield.dependsOn.mappings.splice(mappingIndex, 1);
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
            completionStatus: formValue.completionStatus || 'Approved',
            timeline: {
                startDate: formValue.startDate || null,
                endDate: formValue.endDate || null
            },
            groups: formValue.groups,
            formSchema: this.formFields,
            statusOptions: this.statusOptions
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

    // Helper to get selected field's array fields safely
    get selectedFieldArrayFields(): ArraySubField[] | undefined {
        if (this.selectedFieldIndex !== null) {
            return this.formFields[this.selectedFieldIndex]?.arrayFields;
        }
        return undefined;
    }

    loadOrganizations(): void {
        if (!this.isSuperAdmin) {
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

    isFieldInvalid(fieldName: string): boolean {
        const field = this.goalForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }
}
