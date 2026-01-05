import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';


interface Breadcrumb {
  label: string;
  url: string;
  icon?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isDropdownOpen = false;
  breadcrumbs: Breadcrumb[] = [];
  isDarkMode = true;
  private destroy$ = new Subject<void>();

  private routeIcons: { [key: string]: string } = {
    'dashboard': '<path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"></path><polyline points=\"9 22 9 12 15 12 15 22\"></polyline>',
    'home': '<path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"></path><polyline points=\"9 22 9 12 15 12 15 22\"></polyline>',
    'goals': '<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><circle cx=\"12\" cy=\"12\" r=\"6\"></circle><circle cx=\"12\" cy=\"12\" r=\"2\"></circle>',
    'admin': '<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"></path>',
    'organizations': '<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\" ry=\"2\"></rect><path d=\"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"></path>',
    'reports': '<path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"></path><path d=\"M22 12A10 10 0 0 0 12 2v10z\"></path>',
    'settings': '<circle cx=\"12\" cy=\"12\" r=\"3\"></circle><path d=\"M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m-6 0l-4.2 4.2\"></path>',
    'profile': '<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"></path><circle cx=\"12\" cy=\"7\" r=\"4\"></circle>',
    'users': '<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"9\" cy=\"7\" r=\"4\"></circle><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"></path><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"></path>',
    'groups': '<circle cx=\"9\" cy=\"7\" r=\"4\"></circle><path d=\"M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2\"></path><path d=\"M16 11h6m-3-3v6\"></path>',
    'leads': '<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"8.5\" cy=\"7\" r=\"4\"></circle><polyline points=\"17 11 19 13 23 9\"></polyline>',
    'create': '<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"16\"></line><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"></line>',
    'edit': '<path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"></path><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"></path>',
    'list': '<line x1=\"8\" y1=\"6\" x2=\"21\" y2=\"6\"></line><line x1=\"8\" y1=\"12\" x2=\"21\" y2=\"12\"></line><line x1=\"8\" y1=\"18\" x2=\"21\" y2=\"18\"></line><line x1=\"3\" y1=\"6\" x2=\"3.01\" y2=\"6\"></line><line x1=\"3\" y1=\"12\" x2=\"3.01\" y2=\"12\"></line><line x1=\"3\" y1=\"18\" x2=\"3.01\" y2=\"18\"></line>',
    'analytics': '<polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"></polyline>',
    'calendar': '<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"></line><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"></line><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"></line>'
  };

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private breadcrumbService: BreadcrumbService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Subscribe to theme changes
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.isDarkMode = theme === 'dark';
      });

    // Subscribe to breadcrumb label changes
    this.breadcrumbService.labels$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.generateBreadcrumbs();
      });

    // Generate initial breadcrumbs
    this.generateBreadcrumbs();

    // Update breadcrumbs on route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.generateBreadcrumbs();
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  getSafeIcon(iconSvg: string): SafeHtml {
    const svgElement = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconSvg}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svgElement);
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'U';
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return this.currentUser.name.substring(0, 2).toUpperCase();
  }

  generateBreadcrumbs(): void {
    const url = this.router.url;
    const urlSegments = url.split('/').filter(segment => segment);
    this.breadcrumbs = [];

    // Always add home/dashboard as first breadcrumb
    this.breadcrumbs.push({
      label: 'Home',
      url: '/dashboard',
      icon: this.routeIcons['dashboard']
    });

    // Build breadcrumbs from URL segments
    let currentUrl = '';
    urlSegments.forEach((segment, index) => {
      currentUrl += `/${segment}`;

      // Format the label
      let label = this.breadcrumbService.getLabel(segment) || segment;

      // If no custom label, do default formatting
      if (label === segment) {
        // Skip if it's just a number (likely an ID)
        if (!isNaN(Number(segment))) {
          return;
        }

        label = segment.charAt(0).toUpperCase() + segment.slice(1);
        label = label.replace(/-/g, ' ');
      }

      // Get icon for this segment
      const icon = this.routeIcons[segment] || undefined;

      // Special handling for common routes
      if (segment === 'admin' && urlSegments[index + 1] === 'dashboard') {
        label = 'Admin Panel';
      } else if (segment === 'dashboard' && index > 0) {
        return; // Skip nested dashboard labels
      }

      this.breadcrumbs.push({
        label,
        url: currentUrl,
        icon
      });
    });

    // If we're on the home page, just show home
    if (url === '/' || url === '/dashboard') {
      this.breadcrumbs = [{
        label: 'Dashboard',
        url: '/dashboard',
        icon: this.routeIcons['dashboard']
      }];
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
