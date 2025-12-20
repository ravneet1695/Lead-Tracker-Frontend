import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GoalService, Goal } from '../../services/goal.service';
import { AuthService } from '../../services/auth.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-user-goals',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="goals-container fade-in">
      <div class="goals-header">
        <div>
          <h1>My Goals</h1>
          <p class="text-muted">Track and manage your assigned goals</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="goBack()">
            ← Back to Dashboard
          </button>
          <button class="btn btn-danger" (click)="logout()">Logout</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading goals...</p>
      </div>

      <div *ngIf="!loading && goals.length === 0" class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3>No Goals Assigned Yet</h3>
        <p>You don't have any goals assigned to your groups at the moment.</p>
        <button class="btn btn-primary" (click)="goBack()">Return to Dashboard</button>
      </div>

      <div *ngIf="!loading && goals.length > 0" class="goals-grid">
        <div *ngFor="let goal of goals" class="goal-card">
          <div class="goal-card-header">
            <h3>{{ goal.title }}</h3>
            <span class="status-badge" [class.active]="goal.status === 'active'" 
                  [class.completed]="goal.status === 'completed'"
                  [class.inactive]="goal.status === 'inactive'">
              {{ goal.status }}
            </span>
          </div>

          <p class="goal-description">{{ goal.description || 'No description provided' }}</p>

          <div class="goal-details">
            <div class="detail-item">
              <span class="detail-label">🎯 Target:</span>
              <span class="detail-value">{{ goal.target || 'N/A' }}</span>
            </div>

            <div class="detail-item" *ngIf="goal.timeline?.startDate">
              <span class="detail-label">📅 Start Date:</span>
              <span class="detail-value">{{ formatDate(goal.timeline.startDate) }}</span>
            </div>

            <div class="detail-item" *ngIf="goal.timeline?.endDate">
              <span class="detail-label">🏁 End Date:</span>
              <span class="detail-value">{{ formatDate(goal.timeline.endDate) }}</span>
            </div>

            <div class="detail-item" *ngIf="goal.groups && goal.groups.length > 0">
              <span class="detail-label">👥 Groups:</span>
              <div class="groups-list">
                <span *ngFor="let group of goal.groups" class="group-badge">
                  {{ group.name || group }}
                </span>
              </div>
            </div>
          </div>

          <!-- Expanded Details Section -->
          <div *ngIf="expandedGoalId === goal._id" class="expanded-details" @slideDown>
            <div class="expanded-section">
              <h5>📋 Form Schema</h5>
              <div *ngIf="goal.formSchema && goal.formSchema.length > 0; else noFormSchema">
                <div *ngFor="let field of goal.formSchema" class="form-field-item">
                  <div class="field-header">
                    <strong>{{ field.alias }}</strong>
                    <span class="field-type-badge">{{ field.fieldType }}</span>
                  </div>
                  <div class="field-details">
                    <span class="field-detail">Field Name: {{ field.fieldName }}</span>
                    <span class="field-detail" *ngIf="field.mandatory">
                      <span class="mandatory-badge">Required</span>
                    </span>
                    <span class="field-detail" *ngIf="field.options && field.options.length > 0">
                      Options: {{ field.options.join(', ') }}
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noFormSchema>
                <p class="text-muted">No form schema configured</p>
              </ng-template>
            </div>

            <div class="expanded-section">
              <h5>🏆 Points Configuration</h5>
              <div class="points-grid">
                <div class="point-item">
                  <span class="point-label">Entry Creation:</span>
                  <span class="point-value">{{ goal.pointsConfig?.entryCreation || 0 }} pts</span>
                </div>
                <div class="point-item">
                  <span class="point-label">Status Update:</span>
                  <span class="point-value">{{ goal.pointsConfig?.statusUpdate || 0 }} pts</span>
                </div>
                <div class="point-item">
                  <span class="point-label">Field Completion:</span>
                  <span class="point-value">{{ goal.pointsConfig?.fieldCompletion || 0 }} pts</span>
                </div>
              </div>
            </div>

            <div class="expanded-section" *ngIf="goal.statusOptions && goal.statusOptions.length > 0">
              <h5>📊 Status Options</h5>
              <div class="status-options">
                <span *ngFor="let status of goal.statusOptions" class="status-option-badge">
                  {{ status }}
                </span>
              </div>
            </div>

            <div class="expanded-section" *ngIf="goal.createdBy">
              <h5>👤 Created By</h5>
              <p class="creator-info">
                {{ goal.createdBy.name }} ({{ goal.createdBy.email }})
              </p>
            </div>

            <div class="expanded-section">
              <h5>🕐 Timestamps</h5>
              <div class="timestamps">
                <div class="timestamp-item">
                  <span>Created:</span>
                  <span>{{ formatDate(goal.createdAt) }}</span>
                </div>
                <div class="timestamp-item" *ngIf="goal.updatedAt">
                  <span>Updated:</span>
                  <span>{{ formatDate(goal.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="goal-footer">
            <button class="btn btn-primary btn-sm" (click)="viewGoalDetails(goal._id)">
              {{ expandedGoalId === goal._id ? 'Hide Details' : 'View Details' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .goals-container {
      padding: 30px;
      min-height: 100vh;
    }

    .goals-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--border-color);
    }

    .goals-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 5px;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 20px;
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: var(--card-bg);
      border-radius: 20px;
      margin: 40px auto;
      max-width: 600px;
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.8rem;
      margin-bottom: 10px;
    }

    .empty-state p {
      color: var(--text-secondary);
      margin-bottom: 30px;
    }

    .goals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .goal-card {
      background: var(--card-bg);
      border-radius: 20px;
      padding: 28px;
      transition: all 0.3s ease;
      border: 1px solid var(--border-color);
      position: relative;
      overflow: hidden;
    }

    .goal-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--primary-gradient);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .goal-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    }

    .goal-card:hover::before {
      transform: scaleX(1);
    }

    .goal-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 12px;
    }

    .goal-card-header h3 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
      flex: 1;
    }

    .status-badge {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.active {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .status-badge.completed {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .status-badge.inactive {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }

    .goal-description {
      color: var(--text-secondary);
      margin-bottom: 24px;
      line-height: 1.6;
      font-size: 0.95rem;
    }

    .goal-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .detail-label {
      font-weight: 600;
      color: var(--text-secondary);
      min-width: 120px;
      font-size: 0.9rem;
    }

    .detail-value {
      color: var(--text-primary);
      font-weight: 500;
    }

    .groups-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .group-badge {
      padding: 4px 12px;
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .expanded-details {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid var(--border-color);
      /* animation handled by @slideDown trigger */
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        max-height: 2000px; /* A large enough value to accommodate content */
        transform: translateY(0);
      }
    }

    .expanded-section {
      margin-bottom: 24px;
    }

    .expanded-section h5 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .form-field-item {
      background: rgba(255, 255, 255, 0.03);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      border: 1px solid var(--border-color);
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .field-type-badge {
      padding: 3px 10px;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .field-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .mandatory-badge {
      padding: 2px 8px;
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .points-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .point-item {
      background: rgba(255, 255, 255, 0.03);
      padding: 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border: 1px solid var(--border-color);
    }

    .point-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .point-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: #fbbf24;
    }

    .status-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .status-option-badge {
      padding: 6px 14px;
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .creator-info {
      color: var(--text-secondary);
      margin: 0;
    }

    .timestamps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .timestamp-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .timestamp-item span:first-child {
      color: var(--text-secondary);
    }

    .timestamp-item span:last-child {
      color: var(--text-primary);
      font-weight: 500;
    }

    .goal-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .btn {
      padding: 10px 24px;
      border-radius: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.95rem;
    }

    .btn-primary {
      background: var(--primary-gradient);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-sm {
      padding: 8px 20px;
      font-size: 0.9rem;
    }

    .fade-in {
      animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .goals-grid {
        grid-template-columns: 1fr;
      }

      .goals-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
      }

      .points-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  animations: [
    trigger('slideDown', [
      state('void', style({
        height: '0',
        opacity: '0',
        transform: 'translateY(-10px)'
      })),
      transition(':enter', [
        animate('0.3s ease-out', style({
          height: '*',
          opacity: '1',
          transform: 'translateY(0)'
        }))
      ]),
      transition(':leave', [
        style({
          height: '*',
          opacity: '1',
          transform: 'translateY(0)'
        }),
        animate('0.3s ease-in', style({
          height: '0',
          opacity: '0',
          transform: 'translateY(-10px)'
        }))
      ])
    ])
  ]
})
export class UserGoalsComponent implements OnInit {
  goals: any[] = [];
  loading = true;
  expandedGoalId: string | null = null;

  constructor(
    private goalService: GoalService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.loading = true;
    this.goalService.getGoals().subscribe({
      next: (response) => {
        this.goals = response.goals || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading goals:', err);
        this.loading = false;
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

  viewGoalDetails(goalId: string | undefined): void {
    if (goalId) {
      // Toggle expansion
      this.expandedGoalId = this.expandedGoalId === goalId ? null : goalId;
    }
  }

  goBack(): void {
    const role = this.authService.currentUserValue?.role || 'sales';
    this.router.navigate([`/${role}/dashboard`]);
  }

  logout(): void {
    this.authService.logout();
  }
}
