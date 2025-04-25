import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../services/teacher.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import Swal from 'sweetalert2';
import { DomSanitizer } from '@angular/platform-browser';

interface TeacherDetails {
  teacherId?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  dob?: string;
  classTeacher?: string | null;
}

@Component({
  selector: 'app-teacher-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-details.component.html',
  styleUrl: './teacher-details.component.css'
})
export class TeacherDetailsComponent implements OnInit, OnDestroy {
  teacherId: string = '';
  teacherDetails: TeacherDetails | null = null;
  role: string = '';
  isEditing: boolean = false;
  updatedDetails: TeacherDetails | null = null;
  changePasswordForm: FormGroup;
  private ngUnsubscribe = new Subject<void>();
  showOldPassword = false;
  showNewPassword = false;
  showConfirmNewPassword = false;
  private readonly eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  private readonly eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M17.94 17.94A10.01 10.01 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M15 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/><path d="M3 3l18 18"/></svg>`;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teacherService: TeacherService,
    private authService: AuthService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) {
    this.changePasswordForm = this.fb.group({
      oldPassword: [''],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.ngUnsubscribe)).subscribe(params => {
      this.teacherId = params['teacherId'];
      if (this.teacherId) {
        this.loadTeacherDetails(this.teacherId);
      }
    });
    this.role = this.authService.getUserRole();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  loadTeacherDetails(teacherId: string): void {
    this.teacherService.getTeacher(teacherId).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
      next: (details) => {
        this.teacherDetails = details;
        this.updatedDetails = { ...details };
      },
      error: (error) => {
        console.error('Error fetching teacher details:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load teacher details.',
        });
      }
    });
  }

  getUserRole(): string {
    return this.role;
  }

  enableEditMode(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to edit the teacher details?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, edit it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.isEditing = true;
      }
    });
  }

  cancelEditMode(): void {
    this.isEditing = false;
    this.updatedDetails = { ...this.teacherDetails! };
    Swal.fire({
      icon: 'info',
      title: 'Cancelled',
      text: 'Edit mode cancelled. No changes saved.',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  saveTeacherDetails(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to save the changes to the teacher details?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, save it!',
    }).then((result) => {
      if (result.isConfirmed) {
        if (this.updatedDetails) {
          this.teacherService.updateTeacher(this.teacherId, this.updatedDetails).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
            next: (response) => {
              console.log('Teacher details updated successfully:', response);
              this.teacherDetails = { ...this.updatedDetails };
              this.isEditing = false;
              Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Teacher details have been updated.',
                timer: 1500,
                showConfirmButton: false,
              });
            },
            error: (error) => {
              console.error('Error updating teacher details:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: 'Failed to update teacher details.',
              });
            }
          });
        }
      }
    });
  }

  updateFieldValue(field: keyof TeacherDetails, event: any): void {
    if (this.updatedDetails) {
      this.updatedDetails[field] = event.target.value;
    }
  }

  goBackToTeacherList(): void {
    this.router.navigate(['/dashboard/teacher-list']);
  }

  changePassword(): void {
    const showOldPassword = (this.role !== 'ADMIN');

    this.showOldPassword = false;
    this.showNewPassword = false;
    this.showConfirmNewPassword = false;

    Swal.fire({
      title: 'Change Password',
      html:
        `<div class="change-password-form">
          ${showOldPassword ? `<input id="oldPassword" type="password" class="swal2-input" placeholder="Current Password">
          <span id="showOldPassword" class="password-toggle">${this.showOldPassword ? this.getEyeIcon('eye') : this.getEyeIcon('eye-off')}</span><br>` : ''}
          <input id="newPassword" type="password" class="swal2-input" placeholder="New Password">
          <span id="showNewPassword" class="password-toggle">${this.showNewPassword ? this.getEyeIcon('eye') : this.getEyeIcon('eye-off')}</span><br>
          <input id="confirmNewPassword" type="password" class="swal2-input" placeholder="Confirm New Password">
          <span id="showConfirmNewPassword" class="password-toggle">${this.showConfirmNewPassword ? this.getEyeIcon('eye') : this.getEyeIcon('eye-off')}</span>
        </div>`,
      focusConfirm: false,
      preConfirm: () => {
        const oldPassword = showOldPassword ? (document.getElementById('oldPassword') as HTMLInputElement).value : '';
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement).value;
        const confirmNewPassword = (document.getElementById('confirmNewPassword') as HTMLInputElement).value;
        return { oldPassword, newPassword, confirmNewPassword };
      },
      showCancelButton: true,
      confirmButtonText: 'Change Password',
      cancelButtonText: 'Cancel',
      customClass: {
        input: 'change-password-input',
      },
      didRender: () => {
        if (showOldPassword) {
          const showOldPasswordSpan = document.getElementById('showOldPassword');
          if (showOldPasswordSpan) {
            showOldPasswordSpan.addEventListener('click', () => {
              this.showOldPassword = !this.showOldPassword;
              const oldPasswordField = document.getElementById('oldPassword') as HTMLInputElement;
              oldPasswordField.type = this.showOldPassword ? 'text' : 'password';
              showOldPasswordSpan.innerHTML = this.showOldPassword ? this.getEyeIcon('eye') : this.getEyeIcon('eye-off');
            });
          }
        }

        const showNewPasswordSpan = document.getElementById('showNewPassword');
        if (showNewPasswordSpan) {
          showNewPasswordSpan.addEventListener('click', () => {
            this.showNewPassword = !this.showNewPassword;
            const newPasswordField = document.getElementById('newPassword') as HTMLInputElement;
            newPasswordField.type = this.showNewPassword ? 'text' : 'password';
            showNewPasswordSpan.innerHTML = this.showNewPassword ? this.getEyeIcon('eye') : this.getEyeIcon('eye-off');
          });
        }

        const showConfirmNewPasswordSpan = document.getElementById('showConfirmNewPassword');
        if (showConfirmNewPasswordSpan) {
          showConfirmNewPasswordSpan.addEventListener('click', () => {
            this.showConfirmNewPassword = !this.showConfirmNewPassword;
            const confirmNewPasswordField = document.getElementById('confirmNewPassword') as HTMLInputElement;
            confirmNewPasswordField.type = this.showConfirmNewPassword ? 'text' : 'password';
            showConfirmNewPasswordSpan.innerHTML = this.showConfirmNewPassword ? this.getEyeIcon('eye') : this.getEyeIcon('eye-off');
          });
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const { oldPassword, newPassword, confirmNewPassword } = result.value as any;

        if (showOldPassword && !oldPassword) {
          Swal.fire('Error', 'Current Password is required', 'error');
          return;
        }

        if (!newPassword || !confirmNewPassword) {
          Swal.fire('Error', 'New Password and Confirm New Password are required', 'error');
          return;
        }

        if (newPassword !== confirmNewPassword) {
          Swal.fire('Error', 'New passwords do not match', 'error');
          return;
        }

        if (newPassword.length <= 6) {
          Swal.fire('Error', 'New password must be more than 6 characters', 'error');
          return;
        }

        const payload = {
          userId: this.teacherId,
          oldPassword: oldPassword,
          newPassword: newPassword
        };

        this.authService.changePassword(payload).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
          next: (response) => {
            Swal.fire('Success', 'Password changed successfully!', 'success');
          },
          error: (error) => {
            console.error('Error changing password', error);
            Swal.fire('Error', error.error || 'Failed to change password', 'error');
          }
        });
      }
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmNewPassword = formGroup.get('confirmNewPassword')?.value;

    if (newPassword === confirmNewPassword) {
      return null;
    } else {
      return { passwordMismatch: true };
    }
  }

    getEyeIcon(type: 'eye' | 'eye-off'): string {
    return type === 'eye' ? this.eyeIcon : this.eyeOffIcon;
  }
}

