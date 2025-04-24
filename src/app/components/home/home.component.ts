import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule, FormsModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  authenticated = false;
  showLoginForm = false;
  studentId = '';
  password = '';
  loginState = 'initial';
  hidePassword = true;

  constructor(private authService: AuthService, private snackBar: MatSnackBar, private router: Router) { }

  ngOnInit() {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('token')) {
      this.authenticated = true;
      this.router.navigate(['/dashboard']);
    }
  }

  login() {
    this.showLoginForm = true;
    this.loginState = 'loginActive';
  }

  cancelLogin() {
    this.showLoginForm = false;
    this.loginState = 'initial';
  }

  submitLogin() {
    if (!this.studentId.trim() || !this.password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter your User ID and Password.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    this.authService.login(this.studentId, this.password).subscribe({
      next: (token) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('token', token);
        }
        this.authenticated = true;
        this.showLoginForm = false;
        this.loginState = 'initial';

        const redirectUrl = localStorage.getItem('redirectUrl') || '/dashboard';
        localStorage.removeItem('redirectUrl');
        this.router.navigateByUrl(redirectUrl);
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'Incorrect Credentials',
          confirmButtonColor: '#d33',
        });
        console.error('Login error:', error);
      }
    });
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    this.authenticated = false;
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  forgotPassword() {
  Swal.fire({
    title: 'Forgot Password',
    html: `
      <input id="swal-input1" class="swal2-input" style="width: 90%; max-width: 350px; padding: 0.5rem; margin-bottom: 0.75rem; box-sizing: border-box;" placeholder="Enter your User ID">
      <input id="swal-input2" class="swal2-input" style="width: 90%; max-width: 350px; padding: 0.5rem; margin-bottom: 0.75rem; box-sizing: border-box;" placeholder="Enter your registered Email Address">
    `,
    showCancelButton: true,
    confirmButtonText: 'Reset Password',
    cancelButtonText: 'Cancel',
    preConfirm: () => {
      const userId = (document.getElementById('swal-input1') as HTMLInputElement).value;
      const email = (document.getElementById('swal-input2') as HTMLInputElement).value;
      if (!userId || !email) {
        Swal.showValidationMessage('Please enter both your User ID and Email Address');
      }
      return { userId: userId, email: email };
    },
    customClass: {
      confirmButton: 'swal-primary-button',
      cancelButton: 'swal-cancel-button'
    }
    }).then((result) => {
      if (result.isConfirmed) {
        const { userId, email } = result.value;
        Swal.fire({
          title: 'Sending Password Reset Email...',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center;">
              <mat-spinner diameter="30"></mat-spinner>
              <p style="margin-top: 16px; color: #777;">Please wait while we verify your details and send the reset link.</p>
            </div>
          `,
          showConfirmButton: false,
          allowOutsideClick: false,
          customClass: {
            container: 'swal-loading-container',
            popup: 'swal-loading-popup'
          }
        });
        this.authService.requestPasswordReset(userId, email).subscribe({ // Modified service call
          next: (response: any) => {
            Swal.close();
            Swal.fire({
              title: 'Password Reset Email Sent',
              text: response.message || 'A password reset link has been sent to your email address.',
              icon: 'success',
              confirmButtonColor: '#3085d6',
              customClass: {
                confirmButton: 'swal-primary-button'
              }
            });
          },
          error: (error: any) => {
            Swal.close();
            Swal.fire({
              title: 'Error',
              text: error.error || 'Failed to request password reset. Please check your User ID and Email Address.',
              icon: 'error',
              confirmButtonColor: '#d33',
              customClass: {
                confirmButton: 'swal-error-button'
              }
            });
          }
        });
      }
    });
  }
}

