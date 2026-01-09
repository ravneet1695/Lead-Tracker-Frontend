import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarService } from './services/sidebar.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="app-container" [class.sidebar-collapsed]="sidebarCollapsed">
      <app-sidebar *ngIf="showSidebar"></app-sidebar>
      <app-header *ngIf="showSidebar"></app-header>
      <div class="main-content" [class.with-sidebar]="showSidebar">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      min-height: 100vh;
      background: var(--dark-bg);
    }

    .main-content {
      flex: 1;
      transition: margin-left var(--transition-base), padding-top var(--transition-base);
      min-height: 100vh;
    }

    .main-content.with-sidebar {
      margin-left: 220px;
      padding-top: 52px; /* Further reduced from 60px */
    }

    /* Adjust main-content when sidebar is collapsed */
    .app-container.sidebar-collapsed .main-content.with-sidebar {
      margin-left: 70px;
    }

    @media (max-width: 768px) {
      .main-content.with-sidebar {
        margin-left: 0;
      }
    }
  `]
})
export class AppComponent implements OnDestroy {
  title = 'frontend';
  showSidebar = false;
  sidebarCollapsed = false;
  private sidebarSubscription?: Subscription;

  constructor(private router: Router, private sidebarService: SidebarService) {
    // Listen to route changes to show/hide sidebar
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Hide sidebar on login page
      this.showSidebar = !event.url.includes('/login');
    });

    // Subscribe to sidebar collapse state
    this.sidebarSubscription = this.sidebarService.isCollapsed$.subscribe(
      (collapsed) => {
        this.sidebarCollapsed = collapsed;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
  }
}
