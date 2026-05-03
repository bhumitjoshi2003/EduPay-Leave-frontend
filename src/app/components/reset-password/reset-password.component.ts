import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import Swal from 'sweetalert2';

import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
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
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.checkPasswordMatch });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.resetToken = params['token'];
      if (!this.resetToken) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Reset Link',
          text: 'The password reset link is invalid or missing.',
          confirmButtonColor: '#1e3a5f',
        }).then(() => {
          this.router.navigate(['/']);
        });
      }
    });
  }

  checkPasswordMatch(group: FormGroup) {
    const newPassword     = group.controls['newPassword'].value;
    const confirmPassword = group.controls['confirmPassword'].value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.resetForm.valid && this.resetToken) {
      this.loading = true;
      this.cdr.markForCheck();
      this.authService.resetPassword(this.resetToken, this.resetForm.value.newPassword).subscribe({
        next: (response: any) => {
          this.loading = false;
          this.cdr.markForCheck();
          Swal.fire({
            icon: 'success',
            title: 'Password Reset Successful',
            text: response.message || 'Your password has been reset. You can now sign in with your new password.',
            confirmButtonColor: '#1e3a5f',
            confirmButtonText: 'Sign In'
          }).then(() => {
            this.router.navigate(['/']);
          });
        },
        error: (error: any) => {
          this.loading = false;
          this.cdr.markForCheck();
          Swal.fire({
            icon: 'error',
            title: 'Password Reset Failed',
            text: error.error || 'The link may be invalid or expired. Please request a new reset link.',
            confirmButtonColor: '#1e3a5f'
          });
        }
      });
    } else {
      this.resetForm.markAllAsTouched();
      this.cdr.markForCheck();
    }
  }

  toggleNewPasswordVisibility() {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }
}
