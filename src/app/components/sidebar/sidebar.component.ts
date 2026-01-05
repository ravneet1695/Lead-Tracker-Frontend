import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  permissions?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isMobile = false;
  currentUser: any = null;
  currentRoute = '';
  organizationName: string = 'Lead Management';
  organizationLogo: string | null = null;
  loadingOrganization = true;
  private destroy$ = new Subject<void>();

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1"/>
        <rect x="14" y="3" width="7" height="5" rx="1"/>
        <rect x="14" y="12" width="7" height="9" rx="1"/>
        <rect x="3" y="16" width="7" height="5" rx="1"/>
      </svg>`,
      route: '/dashboard'
    },
    {
      label: 'Goals',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
        <line x1="12" y1="2" x2="12" y2="6"></line>
      </svg>`,
      route: '/goals',
      permissions: ['goals.read']
    },
    {
      label: 'My Leads',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <polyline points="17 11 19 13 23 9"></polyline>
      </svg>`,
      route: '/leads'
    },
    {
      label: 'Goal Management',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
        <path d="M12 14l-2 2"></path>
      </svg>`,
      route: '/goals/manage',
      permissions: ['goals.create']
    },
    {
      label: 'Users',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>`,
      route: '/users',
      permissions: ['users.read']
    },
    {
      label: 'Groups',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M3 21v-2a4 4 0 0 0 4-4"></path>
        <circle cx="15" cy="7" r="4"></circle>
        <path d="M21 21v-2a4 4 0 0 0-4-4"></path>
        <path d="M12 11h.01"></path>
      </svg>`,
      route: '/groups',
      permissions: ['groups.read']
    },
    {
      label: 'Organizations',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <path d="M3 9h18"></path>
        <path d="M9 21V9"></path>
      </svg>`,
      route: '/organizations',
      permissions: ['organizations.read']
    },
    {
      label: 'Audit Logs',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>`,
      route: '/audit-logs',
      permissions: ['audit-logs.read']
    },
    {
      label: 'Roles',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6"></path>
        <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24"></path>
        <path d="M1 12h6m6 0h6"></path>
        <path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24"></path>
      </svg>`,
      route: '/roles',
      permissions: ['roles.read']
    }
  ];

  constructor(
    private authService: AuthService,
    private sidebarService: SidebarService,
    private router: Router
  ) {
    this.checkMobile();
  }

  ngOnInit(): void {
    // Get current user
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user && user.organization) {
          // Use organization data directly from user object
          this.organizationLogo = user.organization.logo || null;
          this.loadingOrganization = false;
        } else {
          this.loadingOrganization = false;
        }
      });

    // Track current route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });
  }

  checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarService.setSidebarState(this.isCollapsed);
  }

  getVisibleMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => {
      // Check permissions
      if (item.permissions && item.permissions.length > 0) {
        return this.authService.hasAnyPermission(item.permissions);
      }

      // No restrictions, show to everyone
      return true;
    });
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'U';
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return this.currentUser.name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
