import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  loading = false;
  error = '';
  sessionExpired = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
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
            // Redirect to unified dashboard
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message || 'Login failed. Please try again.';
        }
      });
  }
}
