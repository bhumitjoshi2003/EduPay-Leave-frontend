import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { Router } from '@angular/router';
import { LoggerService } from '../../services/logger.service';
import { DemoService } from '../../services/demo.service';
import { ToastService } from '../../services/toast.service';
import { TenantService } from '../../services/tenant.service';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { timeout, TimeoutError } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  authenticated  = false;
  showLoginForm  = false;
  showForgotForm = false;
  showDemoForm   = false;

  userId   = '';
  password = '';
  hidePassword = true;

  forgotUserId  = '';
  forgotEmail   = '';
  sendingReset  = false;

  demo = {
    schoolName:  '',
    contactName: '',
    email:       '',
    phone:       '',
    students:    '',
    city:        '',
    message:     ''
  };

  constructor(
    private authService: AuthService,
    private authStateService: AuthStateService,
    private router: Router,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private demoService: DemoService,
    private toast: ToastService,
    public tenantService: TenantService
  ) { }

  ngOnInit() {
    if (this.authStateService.isLoggedIn()) {
      const user = this.authStateService.getUser();
      // School user on the root domain → bounce to their school subdomain.
      // SUPER_ADMIN has no schoolSlug and stays on the root domain.
      if (user?.schoolSlug && !this.tenantService.slug) {
        window.location.href = this.tenantService.buildSchoolUrl(user.schoolSlug, '/dashboard');
        return;
      }
      this.authenticated = true;
      this.router.navigate(['/dashboard']);
    } else if (this.tenantService.slug) {
      // Not logged in on a school subdomain — login is only on the root domain.
      // Redirect (e.g. session expired while on subdomain, or direct URL entry).
      const rootUrl = window.location.origin.replace(`${this.tenantService.slug}.`, '');
      window.location.href = rootUrl;
    }
  }

  // ── Login ─────────────────────────────────────────────────
  login() {
    this.showLoginForm = true;
    this.cdr.markForCheck();
  }

  cancelLogin() {
    this.showLoginForm = false;
    this.userId = '';
    this.password = '';
    this.cdr.markForCheck();
  }

  submitLogin() {
    if (!this.userId.trim() || !this.password.trim()) {
      this.toast.warning('Missing Information', 'Please enter your User ID and Password.');
      return;
    }

    this.authService.login(this.userId, this.password).subscribe({
      next: (response) => {
        this.authStateService.setUser(response);

        // School user → redirect to their school subdomain for the session.
        // SUPER_ADMIN has no schoolSlug and stays on the root domain.
        if (response.schoolSlug) {
          localStorage.removeItem('redirectUrl');
          window.location.href = this.tenantService.buildSchoolUrl(response.schoolSlug, '/dashboard');
          return;
        }

        this.authenticated = true;
        this.showLoginForm = false;
        this.cdr.markForCheck();

        const redirectUrl = localStorage.getItem('redirectUrl') || '/dashboard';
        localStorage.removeItem('redirectUrl');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        const text = error.status === 0
          ? 'Cannot reach the server. Please check your internet connection.'
          : 'Incorrect User ID or Password.';
        this.toast.error('Login Failed', text);
        this.logger.error('Login error:', error);
      }
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => { this.authenticated = false; this.cdr.markForCheck(); },
      error: () => { this.authenticated = false; this.cdr.markForCheck(); }
    });
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  // ── Forgot Password ──────────────────────────────────────
  forgotPassword() {
    this.showLoginForm  = false;
    this.forgotUserId   = '';
    this.forgotEmail    = '';
    this.sendingReset   = false;
    this.showForgotForm = true;
    this.cdr.markForCheck();
  }

  cancelForgot() {
    this.showForgotForm = false;
    this.cdr.markForCheck();
  }

  submitForgot() {
    const uid   = this.forgotUserId.trim();
    const email = this.forgotEmail.trim();
    if (!uid || !email) {
      this.toast.warning('Required', 'Please enter both your User ID and registered email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.toast.warning('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    this.sendingReset = true;
    this.cdr.markForCheck();

    this.authService.requestPasswordReset(uid, email).subscribe({
      next: (response: any) => {
        this.sendingReset   = false;
        this.showForgotForm = false;
        this.cdr.markForCheck();
        this.toast.confirm({
          icon: 'success',
          title: 'Reset Link Sent!',
          html: `<p>A password reset link has been sent to <strong>${email}</strong>. Check your inbox and follow the link to set your new password.</p>`,
          confirmText: 'Got it!'
        });
      },
      error: (error: any) => {
        this.sendingReset = false;
        this.cdr.markForCheck();
        this.toast.error('Could Not Send Link', error?.error || 'Please verify your User ID and registered email, then try again.');
      }
    });
  }

  // ── Demo Booking ──────────────────────────────────────────
  openDemo() {
    this.showDemoForm = true;
    this.cdr.markForCheck();
  }

  closeDemo() {
    this.showDemoForm = false;
    this.cdr.markForCheck();
  }

  submitDemo() {
    const { schoolName, contactName, email, phone } = this.demo;
    if (!schoolName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) {
      this.toast.warning('Required Fields', 'Please fill in School Name, Contact Name, Email and Phone.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      this.toast.warning('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    this.demoService.submitRequest({
      schoolName:       this.demo.schoolName.trim(),
      contactName:      this.demo.contactName.trim(),
      email:            this.demo.email.trim(),
      phone:            this.demo.phone.trim(),
      numberOfStudents: this.demo.students.trim() || undefined,
      city:             this.demo.city.trim()     || undefined,
      message:          this.demo.message.trim()  || undefined
    }).pipe(timeout(20000)).subscribe({
      next: () => {
        this.showDemoForm = false;
        this.demo = { schoolName: '', contactName: '', email: '', phone: '', students: '', city: '', message: '' };
        this.cdr.markForCheck();
        this.toast.confirm({
          icon: 'success',
          title: 'Demo Request Received!',
          html: '<p>Thank you! Our team will reach out within <strong>24 hours</strong> to schedule your personalised demo.</p>',
          confirmText: 'Awesome, Thanks!'
        });
      },
      error: (err) => {
        this.logger.error('Demo request failed:', err);
        const isTimeout = err instanceof TimeoutError;
        this.toast.error(
          isTimeout ? 'Request Timed Out' : 'Submission Failed',
          isTimeout
            ? 'The server took too long to respond. Please check your connection and try again.'
            : 'Could not send your request. Please try again or contact us directly.'
        );
      }
    });
  }
}
