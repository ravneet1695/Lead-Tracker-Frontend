import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  credentials = {
    email: '',
    password: ''
  };
  loading = false;
  error = '';
  sessionExpired = false;
  showPassword = false;

  // First-time password change
  showPasswordChangeForm = false;
  tempEmail = '';
  tempCurrentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;
  passwordErrors: string[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private themeService: ThemeService
  ) {
    // Check for session expiration message
    this.route.queryParams.subscribe(params => {
      if (params['message'] === 'session_expired') {
        this.sessionExpired = true;
      }
    });

    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    // Force light theme on login page
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }

  ngOnDestroy(): void {
    // Re-apply the user's preferred theme when leaving login
    const currentTheme = this.themeService.getCurrentTheme();
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${currentTheme}-theme`);
  }

  fillCredentials(email: string, password: string): void {
    this.credentials.email = email;
    this.credentials.password = password;
    this.error = '';
    this.sessionExpired = false;
  }

  onSubmit(): void {
    this.error = '';
    this.sessionExpired = false;
    this.loading = true;

    this.authService.login(this.credentials.email, this.credentials.password)
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            // Check if user must change password
            if (response.mustChangePassword) {
              this.showPasswordChangeForm = true;
              this.tempEmail = this.credentials.email;
              this.tempCurrentPassword = this.credentials.password;
            } else {
              // Normal login - redirect to dashboard
              this.router.navigate(['/dashboard']);
            }
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message || 'Login failed. Please try again.';
        }
      });
  }

  validatePassword(): void {
    this.passwordErrors = [];

    if (!this.newPassword) {
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordErrors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(this.newPassword)) {
      this.passwordErrors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(this.newPassword)) {
      this.passwordErrors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(this.newPassword)) {
      this.passwordErrors.push('Password must contain at least one number');
    }

    if (this.confirmPassword && this.newPassword !== this.confirmPassword) {
      this.passwordErrors.push('Passwords do not match');
    }
  }

  isPasswordValid(): boolean {
    this.validatePassword();
    return this.passwordErrors.length === 0 && this.newPassword.length >= 8 && this.confirmPassword === this.newPassword;
  }

  onPasswordChange(): void {
    if (!this.isPasswordValid()) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.changePasswordFirstTime(
      this.tempEmail,
      this.tempCurrentPassword,
      this.newPassword
    ).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          // Password changed successfully, login complete
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Password change failed. Please try again.';
      }
    });
  }

  cancelPasswordChange(): void {
    this.showPasswordChangeForm = false;
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordErrors = [];
    this.credentials.password = '';
  }

  // Helper methods for template validation
  hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  hasLowerCase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  passwordsMatch(): boolean {
    return !!this.confirmPassword && this.newPassword === this.confirmPassword;
  }
}
