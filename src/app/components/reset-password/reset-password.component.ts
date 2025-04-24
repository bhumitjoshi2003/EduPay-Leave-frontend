import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import Swal from 'sweetalert2';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule, ReactiveFormsModule, MatIconModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string | null = null;
  loading = false;
  hideNewPassword = true;
  hideConfirmPassword = true;
  resetToken: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.checkPasswordMatch });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.resetToken = params['token'];
      if (!this.resetToken) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Reset Link',
          text: 'The password reset link is invalid or missing.',
          confirmButtonColor: '#d33',
        }).then(() => {
          this.router.navigate(['/']); 
        });
      }
    });
  }



  checkPasswordMatch(group: FormGroup) {
    const newPassword = group.controls['newPassword'].value;
    const confirmPassword = group.controls['confirmPassword'].value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.resetForm.valid && this.resetToken) {
      this.loading = true;
      this.authService.resetPassword(this.resetToken, this.resetForm.value.newPassword).subscribe({
        next: (response: any) => {
          this.loading = false;
          Swal.fire({
            icon: 'success',
            title: 'Password Reset Successful',
            text: response.message || 'Your password has been reset successfully. You can now log in with your new password.',
            confirmButtonColor: '#3085d6',
            customClass: {
              confirmButton: 'swal-primary-button'
            }
          }).then(() => {
            this.router.navigate(['/']);
          });
        },
        error: (error: any) => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Password Reset Failed',
            text: error.error || 'Failed to reset password. The link might be invalid or expired. Please try again.',
            confirmButtonColor: '#d33',
            customClass: {
              confirmButton: 'swal-error-button'
            }
          });
        }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Form',
        text: 'Please ensure all fields are filled correctly and passwords match.',
        confirmButtonColor: '#f8bb86',
        customClass: {
          confirmButton: 'swal-warning-button'
        }
      });
    }
  }
  

  toggleNewPasswordVisibility() {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }
}