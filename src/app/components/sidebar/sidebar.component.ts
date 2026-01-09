import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface MenuItem {
  label: string;
  icon: string | SafeHtml;
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
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
      route: '/dashboard'
    },
    {
      label: 'My Goal',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
      route: '/goals',
      permissions: ['goals.read']
    },
    {
      label: 'My Leads',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
      route: '/leads'
    },
    {
      label: 'Goal Management',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      route: '/goals/manage',
      permissions: ['goals.create']
    },
    {
      label: 'Users',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
      route: '/users',
      permissions: ['users.read']
    },
    {
      label: 'Groups',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><path d="M6 15v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/><path d="M12 9v3"/></svg>`,
      route: '/groups',
      permissions: ['groups.read']
    },
    {
      label: 'Organizations',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="2"/><line x1="15" y1="22" x2="15" y2="2"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
      route: '/organizations',
      permissions: ['organizations.read']
    },
    {
      label: 'Audit Logs',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      route: '/audit-logs',
      permissions: ['audit-logs.read']
    },
    {
      label: 'Roles',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>`,
      route: '/roles',
      permissions: ['roles.read']
    }
  ];

  constructor(
    private authService: AuthService,
    private sidebarService: SidebarService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.checkMobile();
    this.sanitizeIcons();
  }

  private sanitizeIcons(): void {
    this.menuItems = this.menuItems.map(item => ({
      ...item,
      icon: this.sanitizer.bypassSecurityTrustHtml(item.icon as string)
    }));
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
