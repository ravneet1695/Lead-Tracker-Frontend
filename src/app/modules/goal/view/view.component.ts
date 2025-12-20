import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-goal-view',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="container">
            <h2>View Goal</h2>
            <p>Goal details view coming soon...</p>
            <button routerLink="/goal-management">Back to Goals</button>
        </div>
    `,
    styles: [`
        .container {
            padding: 32px;
        }
    `]
})
export class GoalViewComponent {
}
