import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-goal-edit',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="container">
            <h2>Edit Goal</h2>
            <p>Goal edit form coming soon...</p>
            <button routerLink="/goal-management">Back to Goals</button>
        </div>
    `,
    styles: [`
        .container {
            padding: 32px;
        }
    `]
})
export class GoalEditComponent {
}
