import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { GoalService } from '../../../services/goal.service';
import { GroupService } from '../../../services/group.service';
import { OrganizationService } from '../../../services/organization.service';
import { AuthService } from '../../../services/auth.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
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
    selector: 'app-goal-edit',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
    templateUrl: '../create/create.component.html', // Reuse create template
    styleUrls: ['../create/create.component.css'] // Reuse create styles
})
export class GoalEditComponent implements OnInit {
    goalForm!: FormGroup;
    goalId: string = '';
    groups: any[] = [];
    organizations: any[] = [];
    formFields: FormField[] = [];
    selectedFieldIndex: number | null = null;
    selectedColumn: number = 0;
    loading = true;
    submitting = false;
    isSuperAdmin = false;
    isEditMode = true;

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

    statusOptions: string[] = [];
    customStatusInput = '';

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private goalService: GoalService,
        private groupService: GroupService,
        private organizationService: OrganizationService,
        private authService: AuthService,
        private router: Router,
        private breadcrumbService: BreadcrumbService
    ) { }

    ngOnInit(): void {
        this.goalId = this.route.snapshot.params['id'];
        this.checkUserRole();
        this.initializeForm();
        this.loadOrganizations();
        this.loadGoal();
    }

    checkUserRole(): void {
        this.isSuperAdmin = this.authService.hasPermission('organizations.read');
    }

    initializeForm(): void {
        this.goalForm = this.fb.group({
            organization: [''],
            title: ['', [Validators.required, Validators.minLength(3)]],
            completionStatus: ['Approved'],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
            group: ['', Validators.required]
        });

        if (this.isSuperAdmin) {
            this.goalForm.get('organization')?.setValidators([Validators.required]);
        }
    }

    loadGoal(): void {
        this.loading = true;
        this.goalService.getGoal(this.goalId).subscribe({
            next: (response) => {
                const goal = response.goal;
                if (goal) {
                    this.breadcrumbService.setLabel(this.goalId, goal.title);
                }
                this.formFields = goal.formSchema || [];
                this.statusOptions = goal.statusOptions || ['New', 'In Progress', 'Completed', 'Cancelled'];

                this.goalForm.patchValue({
                    organization: goal.organization?._id || goal.organization,
                    title: goal.title,
                    completionStatus: goal.completionStatus || 'Approved',
                    startDate: goal.timeline?.startDate ? new Date(goal.timeline.startDate).toISOString().substring(0, 10) : '',
                    endDate: goal.timeline?.endDate ? new Date(goal.timeline.endDate).toISOString().substring(0, 10) : '',
                    group: goal.group?._id || goal.group
                });

                const orgId = goal.organization?._id || goal.organization;
                if (orgId) {
                    this.loadGroups(orgId);
                } else if (!this.isSuperAdmin) {
                    this.loadGroups();
                }

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

    loadOrganizations(): void {
        if (!this.isSuperAdmin) return;
        this.organizationService.getOrganizations().subscribe({
            next: (response) => {
                this.organizations = response.organizations || [];
            }
        });
    }

    loadGroups(organizationId?: string): void {
        const params: any = {};
        if (organizationId) params.organization = organizationId;

        this.groupService.getGroups(params).subscribe({
            next: (response) => {
                this.groups = response.groups || [];
            }
        });
    }

    selectGroup(groupId: string): void {
        this.goalForm.patchValue({ group: groupId });
    }

    isGroupSelected(groupId: string): boolean {
        return this.goalForm.get('group')?.value === groupId;
    }

    // Builder methods (copied from create)
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
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.formFields.splice(index, 1);
                this.formFields.forEach((f, i) => f.order = i);
                if (this.selectedFieldIndex === index) this.selectedFieldIndex = null;
            }
        });
    }

    moveFieldUp(index: number): void {
        if (index > 0) {
            const temp = this.formFields[index];
            this.formFields[index] = this.formFields[index - 1];
            this.formFields[index - 1] = temp;
            this.formFields.forEach((f, i) => f.order = i);
        }
    }

    moveFieldDown(index: number): void {
        if (index < this.formFields.length - 1) {
            const temp = this.formFields[index];
            this.formFields[index] = this.formFields[index + 1];
            this.formFields[index + 1] = temp;
            this.formFields.forEach((f, i) => f.order = i);
        }
    }

    updateFieldName(index: number, value: string): void {
        const fieldName = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        this.formFields[index].fieldName = fieldName || `field_${index + 1}`;
    }

    addOption(index: number): void {
        if (!this.formFields[index].options) this.formFields[index].options = [];
        this.formFields[index].options?.push('');
    }

    removeOption(fieldIndex: number, optionIndex: number): void {
        this.formFields[fieldIndex].options?.splice(optionIndex, 1);
    }

    updateOption(fieldIndex: number, optionIndex: number, value: string): void {
        if (this.formFields[fieldIndex].options) this.formFields[fieldIndex].options![optionIndex] = value;
    }

    addStatusOption(): void {
        if (this.customStatusInput.trim() && !this.statusOptions.includes(this.customStatusInput.trim())) {
            this.statusOptions.push(this.customStatusInput.trim());
            this.customStatusInput = '';
        }
    }

    removeStatusOption(index: number): void {
        this.statusOptions.splice(index, 1);
    }

    // FormArray helpers
    addFieldToArray(arrayFieldIndex: number, fieldType: string): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) arrayField.arrayFields = [];
        arrayField.arrayFields.push({
            fieldName: `subfield_${arrayField.arrayFields.length + 1}`,
            fieldType: fieldType,
            alias: `Sub Field ${arrayField.arrayFields.length + 1}`,
            mandatory: false,
            order: arrayField.arrayFields.length,
            ...(fieldType === 'dropdown' && { options: [] })
        });
    }

    addFieldToArrayColumn(arrayFieldIndex: number, columnIndex: number, fieldType: string): void {
        const arrayField = this.formFields[arrayFieldIndex];
        if (!arrayField.arrayFields) arrayField.arrayFields = [];
        arrayField.arrayFields.push({
            fieldName: `col${columnIndex}_field_${arrayField.arrayFields.length + 1}`,
            fieldType: fieldType,
            alias: `Column ${columnIndex + 1} Field`,
            mandatory: false,
            order: arrayField.arrayFields.length,
            columnIndex: columnIndex,
            ...(fieldType === 'dropdown' && { options: [] })
        });
    }

    getFieldsInColumn(arrayFieldIndex: number, columnIndex: number): ArraySubField[] {
        return this.formFields[arrayFieldIndex].arrayFields?.filter(f => (f.columnIndex || 0) === columnIndex) || [];
    }

    removeFieldFromArray(arrayFieldIndex: number, subfield: ArraySubField): void {
        const af = this.formFields[arrayFieldIndex];
        if (af.arrayFields) {
            const idx = af.arrayFields.indexOf(subfield);
            if (idx > -1) {
                af.arrayFields.splice(idx, 1);
                af.arrayFields.forEach((f, i) => f.order = i);
            }
        }
    }

    updateArraySubfieldAlias(arrayFieldIndex: number, subfield: ArraySubField, value: string): void {
        if (subfield) {
            subfield.alias = value;
            const fn = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            subfield.fieldName = fn || `subfield_${Date.now()}`;
        }
    }

    addArraySubfieldOption(arrayFieldIndex: number, subfield: ArraySubField): void {
        if (!subfield.options) subfield.options = [];
        subfield.options.push(`Option ${subfield.options.length + 1}`);
    }

    updateArraySubfieldOption(afi: number, sf: ArraySubField, oi: number, v: string): void {
        if (sf.options) sf.options[oi] = v;
    }

    removeArraySubfieldOption(afi: number, sf: ArraySubField, oi: number): void {
        sf.options?.splice(oi, 1);
    }

    toggleDependency(afi: number, sfi: number): void {
        const af = this.formFields[afi];
        if (!af.arrayFields) return;
        const sf = af.arrayFields[sfi];
        if (sf.dependsOn) delete sf.dependsOn;
        else sf.dependsOn = { fieldName: '', mappings: [] };
    }

    getPreviousFields(afi: number, sfi: number): ArraySubField[] {
        return this.formFields[afi].arrayFields?.slice(0, sfi) || [];
    }

    addDependencyMapping(afi: number, sfi: number): void {
        this.formFields[afi].arrayFields?.[sfi].dependsOn?.mappings.push({
            when: '', then: { label: '', options: [], show: true }
        });
    }

    removeMapping(afi: number, sfi: number, mi: number): void {
        this.formFields[afi].arrayFields?.[sfi].dependsOn?.mappings.splice(mi, 1);
    }

    onSubmit(): void {
        if (this.goalForm.invalid) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Please fill required fields' });
            return;
        }
        const val = this.goalForm.value;
        const data = {
            title: val.title,
            organization: val.organization || null,
            completionStatus: val.completionStatus || 'Approved',
            timeline: { startDate: val.startDate, endDate: val.endDate },
            group: val.group,
            formSchema: this.formFields,
            statusOptions: this.statusOptions
        };
        this.submitting = true;
        this.goalService.updateGoal(this.goalId, data).subscribe({
            next: () => {
                this.submitting = false;
                Swal.fire({ icon: 'success', title: 'Success', text: 'Goal updated', timer: 2000, showConfirmButton: false });
                this.router.navigate(['/goals/manage']);
            },
            error: (err) => {
                this.submitting = false;
                Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Update failed' });
            }
        });
    }

    cancel(): void { this.router.navigate(['/goals/manage']); }
    getFieldTypeIcon(t: string): string { return this.fieldTypes.find(ft => ft.value === t)?.icon || '❓'; }
    getFieldTypeLabel(t: string): string { return this.fieldTypes.find(ft => ft.value === t)?.label || t; }
    getFieldCategory(t: string): string {
        const txt = ['text', 'email', 'phone', 'textarea', 'autoNumber'];
        const num = ['number', 'currency', 'points'];
        const sel = ['dropdown', 'checkbox', 'radio', 'switch'];
        if (txt.includes(t)) return 'cat-text';
        if (num.includes(t)) return 'cat-number';
        if (sel.includes(t)) return 'cat-select';
        return 'cat-complex';
    }
    get selectedFieldArrayFields(): ArraySubField[] | undefined {
        return this.selectedFieldIndex !== null ? this.formFields[this.selectedFieldIndex]?.arrayFields : undefined;
    }
    isFieldInvalid(n: string): boolean {
        const f = this.goalForm.get(n);
        return !!(f && f.invalid && (f.dirty || f.touched));
    }
    getColumnArray(c: number): number[] { return Array.from({ length: c }, (_, i) => i); }
    canHaveDependency(sf: ArraySubField): boolean { return ['text', 'number', 'dropdown', 'email', 'phone'].includes(sf.fieldType); }
}
