import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { GoalService } from '../../../services/goal.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-goal-view',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './view.component.html',
    styleUrls: ['./view.component.css']
})
export class GoalViewComponent implements OnInit {
    goal: any = null;
    loading = true;
    error = '';
    goalId: string = '';

    fieldTypeIcons: { [key: string]: string } = {
        'text': '📝',
        'number': '🔢',
        'date': '📅',
        'dropdown': '📋',
        'email': '📧',
        'phone': '📞',
        'textarea': '📄',
        'multiContact': '👥',
        'autoNumber': '#️⃣',
        'autoCalculate': '🧮',
        'formArray': '🔁'
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private goalService: GoalService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.goalId = this.route.snapshot.paramMap.get('id') || '';
        if (this.goalId) {
            this.loadGoal();
        } else {
            this.error = 'No goal ID provided';
            this.loading = false;
        }
    }

    loadGoal(): void {
        this.loading = true;
        this.error = '';

        this.goalService.getGoal(this.goalId).subscribe({
            next: (response) => {
                this.goal = response.goal || response;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading goal:', error);
                this.loading = false;
                this.error = error.error?.message || 'Failed to load goal';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: this.error
                });
            }
        });
    }

    formatDate(date: any): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getFieldTypeIcon(type: string): string {
        return this.fieldTypeIcons[type] || '❓';
    }

    getFieldTypeLabel(type: string): string {
        const labels: { [key: string]: string } = {
            'text': 'Text',
            'number': 'Number',
            'date': 'Date',
            'dropdown': 'Dropdown',
            'email': 'Email',
            'phone': 'Phone',
            'textarea': 'Text Area',
            'multiContact': 'Multi Contact',
            'autoNumber': 'Auto Number',
            'autoCalculate': 'Auto Calculate',
            'formArray': 'Repeatable Group'
        };
        return labels[type] || type;
    }

    canEditGoal(): boolean {
        return this.authService.hasPermission('goals.update');
    }

    editGoal(): void {
        this.router.navigate([`/goals/manage/${this.goalId}/edit`]);
    }

    goBack(): void {
        this.router.navigate(['/goals/manage']);
    }

    getStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'active': return 'status-active';
            case 'completed': return 'status-completed';
            case 'inactive': return 'status-inactive';
            default: return 'status-inactive';
        }
    }
}
