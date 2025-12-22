import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { GoalService, Goal } from '../../../services/goal.service';
import { AuthService } from '../../../services/auth.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-goals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="goals-container fade-in">
      <!-- Enhanced Header with Glassmorphism -->
      <div class="goals-header-wrapper">
        <div class="goals-header">
          <div class="header-content">
            <div class="header-title-section">
              <div class="title-icon">🎯</div>
              <div>
                <h1 class="gradient-text">My Goals</h1>
                <p class="header-subtitle">Track your progress and achieve your targets</p>
              </div>
            </div>
            <div class="header-stats" *ngIf="!loading && goals.length > 0">
              <div class="stat-card">
                <div class="stat-value">{{ goals.length }}</div>
                <div class="stat-label">Total Goals</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ getActiveGoalsCount() }}</div>
                <div class="stat-label">Active</div>
              </div>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn btn-success action-btn" routerLink="/goals/my-leads">
              <span class="btn-icon">📋</span>
              <span>My Leads</span>
            </button>
            <button class="btn btn-secondary action-btn" (click)="goBack()">
              <span class="btn-icon">←</span>
              <span>Dashboard</span>
            </button>
            <button class="btn btn-danger action-btn" (click)="logout()">
              <span class="btn-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State with Enhanced Animation -->
      <div *ngIf="loading" class="loading-state">
        <div class="loading-content">
          <div class="spinner-wrapper">
            <div class="spinner"></div>
            <div class="spinner-glow"></div>
          </div>
          <p class="loading-text">Loading your goals...</p>
        </div>
      </div>

      <!-- Enhanced Empty State -->
      <div *ngIf="!loading && goals.length === 0" class="empty-state">
        <div class="empty-content">
          <div class="empty-icon-wrapper">
            <div class="empty-icon">🎯</div>
            <div class="empty-icon-glow"></div>
          </div>
          <h3 class="empty-title">No Goals Assigned Yet</h3>
          <p class="empty-description">You don't have any goals assigned to your groups at the moment.<br>Check back later or contact your manager.</p>
          <button class="btn btn-primary" (click)="goBack()">
            <span class="btn-icon">←</span>
            Return to Dashboard
          </button>
        </div>
      </div>

      <!-- Enhanced Goals Grid -->
      <div *ngIf="!loading && goals.length > 0" class="goals-grid">
        <div *ngFor="let goal of goals; let i = index" 
             class="goal-card" 
             [style.animation-delay]="(i * 0.1) + 's'">
          
          <!-- Card Gradient Border -->
          <div class="card-border-gradient"></div>
          
          <!-- Card Header with Enhanced Design -->
          <div class="goal-card-header">
            <div class="header-left">
              <div class="goal-icon">🎯</div>
              <h3 class="goal-title">{{ goal.title }}</h3>
            </div>
            <span class="status-badge" 
                  [class.active]="goal.status === 'active'" 
                  [class.completed]="goal.status === 'completed'"
                  [class.inactive]="goal.status === 'inactive'">
              <span class="status-icon">
                {{ goal.status === 'active' ? '●' : goal.status === 'completed' ? '✓' : '○' }}
              </span>
              {{ goal.status }}
            </span>
          </div>

          <p class="goal-description">{{ goal.description || 'No description provided' }}</p>

          <!-- Enhanced Progress Section -->
          <div class="progress-section" *ngIf="goal.target && goal.progress">
            <div class="progress-header">
              <div class="progress-info">
                <div class="progress-label">Progress</div>
                <div class="progress-stats-row">
                  <!-- Revenue-based progress -->
                  <span class="stat-item primary" *ngIf="goal.progress.unit === 'value'">
                    <span class="stat-icon">💰</span>
                    <strong>{{ goal.progress.achieved | number:'1.0-2' }}</strong>
                    <span class="stat-separator">/</span>
                    <span>{{ goal.progress.target | number:'1.0-2' }}</span>
                  </span>
                  <!-- Lead count progress -->
                  <span class="stat-item primary" *ngIf="goal.progress.unit === 'count'">
                    <span class="stat-icon">📊</span>
                    <strong>{{ goal.progress.achieved }}</strong>
                    <span class="stat-separator">/</span>
                    <span>{{ goal.progress.target }} leads</span>
                  </span>
                  <!-- Additional info for revenue-based goals -->
                  <span class="stat-item secondary" *ngIf="goal.progress.unit === 'value'">
                    <span class="stat-icon">📈</span>
                    {{ goal.progress.completedLeads }} / {{ goal.progress.totalLeads }} leads
                  </span>
                </div>
              </div>
              <div class="progress-percentage-wrapper">
                <div class="circular-progress" [ngClass]="{
                  'low': goal.progress.percentage < 30,
                  'medium': goal.progress.percentage >= 30 && goal.progress.percentage < 70,
                  'high': goal.progress.percentage >= 70 && goal.progress.percentage < 100,
                  'complete': goal.progress.percentage >= 100
                }">
                  <svg viewBox="0 0 36 36" class="circular-chart">
                    <path class="circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path class="circle"
                      [attr.stroke-dasharray]="goal.progress.percentage + ', 100'"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div class="percentage-text">{{ goal.progress.percentage | number:'1.0-0' }}%</div>
                </div>
              </div>
            </div>
            
            <!-- Linear Progress Bar -->
            <div class="progress-bar-container">
              <div class="progress-bar" 
                   [ngClass]="{
                     'low': goal.progress.percentage < 30,
                     'medium': goal.progress.percentage >= 30 && goal.progress.percentage < 70,
                     'high': goal.progress.percentage >= 70 && goal.progress.percentage < 100,
                     'complete': goal.progress.percentage >= 100
                   }" 
                   [style.width.%]="goal.progress.percentage">
                <div class="progress-bar-shine"></div>
              </div>
            </div>

            <!-- Progress Status Messages -->
            <div class="progress-messages">
              <span class="progress-message remaining" *ngIf="goal.progress.remaining > 0 && goal.progress.percentage < 100">
                <span class="message-icon">⏳</span>
                {{ goal.progress.remaining | number:'1.0-2' }} remaining to reach target
              </span>
              <span class="progress-message completed" *ngIf="goal.progress.percentage >= 100">
                <span class="message-icon">🎉</span>
                Congratulations! Target achieved!
              </span>
            </div>
          </div>

          <!-- Enhanced Goal Details -->
          <div class="goal-details">
            <div class="detail-item">
              <div class="detail-icon">🎯</div>
              <div class="detail-content">
                <span class="detail-label">Target</span>
                <span class="detail-value">{{ goal.target || 'N/A' }}</span>
              </div>
            </div>

            <div class="detail-item" *ngIf="goal.timeline?.startDate">
              <div class="detail-icon">📅</div>
              <div class="detail-content">
                <span class="detail-label">Start Date</span>
                <span class="detail-value">{{ formatDate(goal.timeline.startDate) }}</span>
              </div>
            </div>

            <div class="detail-item" *ngIf="goal.timeline?.endDate">
              <div class="detail-icon">🏁</div>
              <div class="detail-content">
                <span class="detail-label">End Date</span>
                <span class="detail-value">{{ formatDate(goal.timeline.endDate) }}</span>
              </div>
            </div>

            <div class="detail-item full-width" *ngIf="goal.groups && goal.groups.length > 0">
              <div class="detail-icon">👥</div>
              <div class="detail-content">
                <span class="detail-label">Assigned Groups</span>
                <div class="groups-list">
                  <span *ngFor="let group of goal.groups" class="group-badge">
                    <span class="group-icon">●</span>
                    {{ group.name || group }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Expanded Details Section -->
          <div *ngIf="expandedGoalId === goal._id" class="expanded-details" @slideDown>
            <div class="expanded-section">
              <h5 class="section-title">
                <span class="section-icon">📋</span>
                Form Schema
              </h5>
              <div *ngIf="goal.formSchema && goal.formSchema.length > 0; else noFormSchema">
                <div *ngFor="let field of goal.formSchema" class="form-field-item">
                  <div class="field-header">
                    <strong class="field-name">{{ field.alias }}</strong>
                    <span class="field-type-badge">{{ field.fieldType }}</span>
                  </div>
                  <div class="field-details">
                    <span class="field-detail">
                      <span class="field-detail-label">Field Name:</span>
                      {{ field.fieldName }}
                    </span>
                    <span class="field-detail" *ngIf="field.mandatory">
                      <span class="mandatory-badge">
                        <span class="badge-icon">*</span>
                        Required
                      </span>
                    </span>
                    <span class="field-detail" *ngIf="field.options && field.options.length > 0">
                      <span class="field-detail-label">Options:</span>
                      {{ field.options.join(', ') }}
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noFormSchema>
                <p class="text-muted">No form schema configured</p>
              </ng-template>
            </div>

            <div class="expanded-section" *ngIf="goal.statusOptions && goal.statusOptions.length > 0">
              <h5 class="section-title">
                <span class="section-icon">📊</span>
                Status Options
              </h5>
              <div class="status-options">
                <span *ngFor="let status of goal.statusOptions" class="status-option-badge">
                  <span class="status-option-icon">●</span>
                  {{ status }}
                </span>
              </div>
            </div>

            <div class="expanded-section" *ngIf="goal.createdBy">
              <h5 class="section-title">
                <span class="section-icon">👤</span>
                Created By
              </h5>
              <div class="creator-card">
                <div class="creator-avatar">{{ goal.createdBy.name?.charAt(0) || 'U' }}</div>
                <div class="creator-info">
                  <div class="creator-name">{{ goal.createdBy.name }}</div>
                  <div class="creator-email">{{ goal.createdBy.email }}</div>
                </div>
              </div>
            </div>

            <div class="expanded-section">
              <h5 class="section-title">
                <span class="section-icon">🕐</span>
                Timestamps
              </h5>
              <div class="timestamps">
                <div class="timestamp-item">
                  <div class="timestamp-icon">📅</div>
                  <div class="timestamp-content">
                    <span class="timestamp-label">Created</span>
                    <span class="timestamp-value">{{ formatDate(goal.createdAt) }}</span>
                  </div>
                </div>
                <div class="timestamp-item" *ngIf="goal.updatedAt">
                  <div class="timestamp-icon">🔄</div>
                  <div class="timestamp-content">
                    <span class="timestamp-label">Last Updated</span>
                    <span class="timestamp-value">{{ formatDate(goal.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Enhanced Footer Actions -->
          <div class="goal-footer">
            <button class="btn btn-success btn-action" (click)="createLead(goal._id)">
              <span class="btn-icon">➕</span>
              <span>Create Lead</span>
            </button>
            <button class="btn btn-primary btn-action" (click)="viewGoalDetails(goal._id)">
              <span class="btn-icon">{{ expandedGoalId === goal._id ? '▲' : '▼' }}</span>
              <span>{{ expandedGoalId === goal._id ? 'Hide Details' : 'View Details' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Container & Layout */
    .goals-container {
      padding: 0;
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%);
      position: relative;
    }

    .goals-container::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.08) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    /* Enhanced Header with Glassmorphism */
    .goals-header-wrapper {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(15, 15, 30, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(102, 126, 234, 0.2);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
    }

    .goals-header {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 32px;
      flex: 1;
    }

    .header-title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .title-icon {
      font-size: 3rem;
      filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.5));
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    .gradient-text {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }

    .header-subtitle {
      color: #94a3b8;
      margin: 0;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .header-stats {
      display: flex;
      gap: 16px;
    }

    .stat-card {
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 12px;
      padding: 12px 20px;
      text-align: center;
      min-width: 80px;
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      background: rgba(102, 126, 234, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      font-size: 0.9rem;
      white-space: nowrap;
    }

    .btn-icon {
      font-size: 1.1rem;
      display: inline-flex;
      align-items: center;
    }

    /* Enhanced Loading State */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      position: relative;
      z-index: 1;
    }

    .loading-content {
      text-align: center;
    }

    .spinner-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
    }

    .spinner {
      width: 80px;
      height: 80px;
      border: 4px solid rgba(102, 126, 234, 0.1);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      position: relative;
      z-index: 2;
    }

    .spinner-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100px;
      height: 100px;
      background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    }

    .loading-text {
      color: #cbd5e1;
      font-size: 1.1rem;
      font-weight: 500;
    }

    /* Enhanced Empty State */
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 40px;
      position: relative;
      z-index: 1;
    }

    .empty-content {
      text-align: center;
      max-width: 500px;
    }

    .empty-icon-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto 32px;
    }

    .empty-icon {
      font-size: 6rem;
      position: relative;
      z-index: 2;
      animation: float 3s ease-in-out infinite;
    }

    .empty-icon-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 140px;
      height: 140px;
      background: radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    .empty-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .empty-description {
      color: #94a3b8;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    /* Enhanced Goals Grid */
    .goals-grid {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 32px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 32px;
      position: relative;
      z-index: 1;
    }

    /* Premium Goal Cards */
    .goal-card {
      background: linear-gradient(135deg, rgba(26, 29, 46, 0.95) 0%, rgba(31, 34, 51, 0.95) 100%);
      border-radius: 20px;
      padding: 32px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(102, 126, 234, 0.15);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      animation: cardFadeIn 0.6s ease-out backwards;
    }

    @keyframes cardFadeIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card-border-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .goal-card::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(102, 126, 234, 0.05) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.4s ease;
      pointer-events: none;
    }

    .goal-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 24px 60px rgba(102, 126, 234, 0.3);
      border-color: rgba(102, 126, 234, 0.4);
    }

    .goal-card:hover .card-border-gradient {
      transform: scaleX(1);
    }

    .goal-card:hover::before {
      opacity: 1;
    }

    /* Card Header */
    .goal-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
      position: relative;
      z-index: 1;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .goal-icon {
      font-size: 2rem;
      filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.5));
    }

    .goal-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.3;
    }

    /* Enhanced Status Badge */
    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 24px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      transition: all 0.3s ease;
    }

    .status-icon {
      font-size: 0.7rem;
      animation: statusPulse 2s ease-in-out infinite;
    }

    @keyframes statusPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-badge.active {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
    }

    .status-badge.completed {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
    }

    .status-badge.inactive {
      background: rgba(156, 163, 175, 0.15);
      color: #9ca3af;
      border: 1px solid rgba(156, 163, 175, 0.3);
    }

    .goal-description {
      color: #94a3b8;
      margin-bottom: 24px;
      line-height: 1.7;
      font-size: 0.95rem;
      position: relative;
      z-index: 1;
    }

    /* Enhanced Progress Section */
    .progress-section {
      margin-bottom: 28px;
      padding: 24px;
      background: rgba(15, 17, 23, 0.8);
      border-radius: 16px;
      border: 1px solid rgba(102, 126, 234, 0.2);
      position: relative;
      z-index: 1;
      backdrop-filter: blur(10px);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 16px;
    }

    .progress-info {
      flex: 1;
    }

    .progress-label {
      font-size: 0.85rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      font-weight: 600;
    }

    .progress-stats-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      color: #cbd5e1;
    }

    .stat-item.primary {
      font-size: 1.1rem;
    }

    .stat-item.secondary {
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .stat-icon {
      font-size: 1.2rem;
    }

    .stat-item strong {
      color: #818cf8;
      font-size: 1.3rem;
      font-weight: 700;
    }

    .stat-separator {
      color: #64748b;
      margin: 0 4px;
    }

    /* Circular Progress Indicator */
    .progress-percentage-wrapper {
      flex-shrink: 0;
    }

    .circular-progress {
      position: relative;
      width: 80px;
      height: 80px;
    }

    .circular-chart {
      display: block;
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .circle-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.05);
      stroke-width: 3;
    }

    .circle {
      fill: none;
      stroke-width: 3;
      stroke-linecap: round;
      animation: progressFill 1.5s ease-out forwards;
    }

    @keyframes progressFill {
      from { stroke-dasharray: 0, 100; }
    }

    .circular-progress.low .circle {
      stroke: url(#gradient-low);
      stroke: #ef4444;
    }

    .circular-progress.medium .circle {
      stroke: #f59e0b;
    }

    .circular-progress.high .circle {
      stroke: #3b82f6;
    }

    .circular-progress.complete .circle {
      stroke: #10b981;
    }

    .percentage-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.2rem;
      font-weight: 700;
      color: #e2e8f0;
    }

    /* Linear Progress Bar */
    .progress-bar-container {
      width: 100%;
      height: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      margin-bottom: 16px;
    }

    .progress-bar {
      height: 100%;
      border-radius: 12px;
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      min-width: 12px;
    }

    .progress-bar-shine {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .progress-bar.low {
      background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    }

    .progress-bar.medium {
      background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
    }

    .progress-bar.high {
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    }

    .progress-bar.complete {
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
    }

    /* Progress Messages */
    .progress-messages {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-message {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      padding: 8px 12px;
      border-radius: 8px;
    }

    .message-icon {
      font-size: 1.1rem;
    }

    .progress-message.remaining {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .progress-message.completed {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
      animation: celebrationPulse 1s ease-in-out 3;
    }

    @keyframes celebrationPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    /* Enhanced Goal Details */
    .goal-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(102, 126, 234, 0.15);
      position: relative;
      z-index: 1;
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: all 0.3s ease;
    }

    .detail-item.full-width {
      grid-column: 1 / -1;
    }

    .detail-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.3));
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .detail-label {
      font-size: 0.8rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .detail-value {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .groups-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .group-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      border-radius: 16px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid rgba(139, 92, 246, 0.3);
      transition: all 0.3s ease;
    }

    .group-badge:hover {
      background: rgba(139, 92, 246, 0.25);
      transform: translateY(-2px);
    }

    .group-icon {
      font-size: 0.6rem;
    }

    /* Expanded Details */
    .expanded-details {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid rgba(102, 126, 234, 0.2);
      position: relative;
      z-index: 1;
    }

    .expanded-section {
      margin-bottom: 28px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: #e2e8f0;
    }

    .section-icon {
      font-size: 1.3rem;
      filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.5));
    }

    /* Form Field Items */
    .form-field-item {
      background: rgba(255, 255, 255, 0.05);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 12px;
      border: 1px solid rgba(102, 126, 234, 0.15);
      transition: all 0.3s ease;
    }

    .form-field-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(102, 126, 234, 0.3);
      transform: translateX(4px);
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .field-name {
      color: #e2e8f0;
      font-size: 1rem;
    }

    .field-type-badge {
      padding: 4px 12px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .field-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .field-detail {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .field-detail-label {
      font-weight: 600;
      color: #cbd5e1;
    }

    .mandatory-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .badge-icon {
      font-size: 0.9rem;
    }


    /* Status Options */
    .status-options {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .status-option-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border-radius: 16px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid rgba(34, 197, 94, 0.3);
      transition: all 0.3s ease;
    }

    .status-option-badge:hover {
      background: rgba(34, 197, 94, 0.25);
      transform: translateY(-2px);
    }

    .status-option-icon {
      font-size: 0.7rem;
    }

    /* Creator Card */
    .creator-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(102, 126, 234, 0.15);
    }

    .creator-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
    }

    .creator-info {
      flex: 1;
    }

    .creator-name {
      font-size: 1rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 4px;
    }

    .creator-email {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    /* Timestamps */
    .timestamps {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .timestamp-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      border: 1px solid rgba(102, 126, 234, 0.15);
    }

    .timestamp-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .timestamp-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      gap: 12px;
    }

    .timestamp-label {
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .timestamp-value {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 0.9rem;
    }

    /* Goal Footer */
    .goal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid rgba(102, 126, 234, 0.15);
      position: relative;
      z-index: 1;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.95rem;
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .btn:hover::before {
      width: 300px;
      height: 300px;
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    }

    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .btn-success:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      border: 1px solid rgba(102, 126, 234, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(102, 126, 234, 0.3);
    }

    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .btn-danger:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
    }

    /* Animations */
    .fade-in {
      animation: fadeIn 0.6s ease-out;
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

    /* Responsive Design */
    @media (max-width: 1200px) {
      .goals-grid {
        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      }
    }

    @media (max-width: 768px) {
      .goals-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-stats {
        width: 100%;
        justify-content: flex-start;
      }

      .header-actions {
        width: 100%;
        flex-wrap: wrap;
      }

      .action-btn {
        flex: 1;
        min-width: 140px;
        justify-content: center;
      }

      .goals-grid {
        grid-template-columns: 1fr;
        padding: 24px 16px;
      }

      .goal-card {
        padding: 24px;
      }

      .goal-details {
        grid-template-columns: 1fr;
      }

      .points-grid {
        grid-template-columns: 1fr;
      }

      .progress-header {
        flex-direction: column;
        gap: 16px;
      }

      .circular-progress {
        margin: 0 auto;
      }
    }

    @media (max-width: 480px) {
      .gradient-text {
        font-size: 2rem;
      }

      .title-icon {
        font-size: 2.5rem;
      }

      .goal-title {
        font-size: 1.3rem;
      }

      .goal-footer {
        flex-direction: column;
      }

      .btn-action {
        width: 100%;
        justify-content: center;
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

  createLead(goalId: string | undefined): void {
    if (!goalId) {
      console.error('Cannot create lead: goalId is undefined');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid goal selected'
      });
      return;
    }

    this.router.navigate(['/leads/create', goalId])
      .then(success => {
        if (!success) {
          console.error('Navigation to create-lead failed');
          Swal.fire({
            icon: 'error',
            title: 'Navigation Failed',
            text: 'Unable to navigate to create lead page. Please check your permissions.'
          });
        }
      })
      .catch(error => {
        console.error('Navigation error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Navigation Error',
          text: 'An error occurred while navigating to create lead page.'
        });
      });
  }

  goBack(): void {
    const role = this.authService.currentUserValue?.role || 'sales';
    this.router.navigate([`/${role}/dashboard`]);
  }

  logout(): void {
    this.authService.logout();
  }

  getActiveGoalsCount(): number {
    return this.goals.filter(goal => goal.status === 'active').length;
  }
}
