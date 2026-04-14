import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../services/teacher.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule, FormBuilder, FormGroup, Validators, NgForm } from '@angular/forms';
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
  standalone: true,
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

  classList: string[] = [
    'Play group', 'Nursery', 'LKG', 'UKG',
    '1', '2', '3', '4', '5', '6', '7',
    '8', '9', '10', '11', '12'
  ];

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
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load teacher details.' });
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

  // Accepts NgForm now
  saveTeacherDetails(form: NgForm): void {
    if (form.invalid) {
      // 1. Mark all fields as touched to trigger CSS red borders
      form.control.markAllAsTouched();

      // 2. Compile specific error messages based on validation rules
      let errorMessages = '<ul class="swal-error-list">';

      const controls = form.controls;
      if (controls['name']?.errors?.['required']) errorMessages += '<li>Name is required.</li>';

      if (controls['email']?.errors) {
        if (controls['email'].errors['required']) errorMessages += '<li>Email is required.</li>';
        if (controls['email'].errors['email']) errorMessages += '<li>Please enter a valid email address.</li>';
      }

      if (controls['phoneNumber']?.errors) {
        if (controls['phoneNumber'].errors['required']) errorMessages += '<li>Phone number is required.</li>';
        if (controls['phoneNumber'].errors['pattern']) errorMessages += '<li>Phone number must be exactly 10 digits.</li>';
      }

      if (controls['dob']?.errors?.['required']) errorMessages += '<li>Date of Birth is required.</li>';

      errorMessages += '</ul>';

      // 3. Show detailed SweetAlert
      Swal.fire({
        icon: 'error',
        title: 'Oops... Invalid Details',
        html: errorMessages, // Use html property for the list
        confirmButtonColor: '#d33',
      });
      return;
    }

    // Proceeds normally if form is valid
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to save the changes?',
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
              Swal.fire({ icon: 'error', title: 'Error!', text: 'Failed to update teacher details.' });
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
          <span id="showOldPassword" class="password-toggle"><span style="display:none">${this.eyeIcon}</span><span>${this.eyeOffIcon}</span></span><br>` : ''}
          <input id="newPassword" type="password" class="swal2-input" placeholder="New Password">
          <span id="showNewPassword" class="password-toggle"><span style="display:none">${this.eyeIcon}</span><span>${this.eyeOffIcon}</span></span><br>
          <input id="confirmNewPassword" type="password" class="swal2-input" placeholder="Confirm New Password">
          <span id="showConfirmNewPassword" class="password-toggle"><span style="display:none">${this.eyeIcon}</span><span>${this.eyeOffIcon}</span></span>
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
      didRender: () => {
        if (showOldPassword) {
          const showOldPasswordSpan = document.getElementById('showOldPassword');
          if (showOldPasswordSpan) {
            showOldPasswordSpan.addEventListener('click', () => {
              this.showOldPassword = !this.showOldPassword;
              (document.getElementById('oldPassword') as HTMLInputElement).type = this.showOldPassword ? 'text' : 'password';
              this.toggleEyeIcon(showOldPasswordSpan, this.showOldPassword);
            });
          }
        }
        const showNewPasswordSpan = document.getElementById('showNewPassword');
        if (showNewPasswordSpan) {
          showNewPasswordSpan.addEventListener('click', () => {
            this.showNewPassword = !this.showNewPassword;
            (document.getElementById('newPassword') as HTMLInputElement).type = this.showNewPassword ? 'text' : 'password';
            this.toggleEyeIcon(showNewPasswordSpan, this.showNewPassword);
          });
        }
        const showConfirmNewPasswordSpan = document.getElementById('showConfirmNewPassword');
        if (showConfirmNewPasswordSpan) {
          showConfirmNewPasswordSpan.addEventListener('click', () => {
            this.showConfirmNewPassword = !this.showConfirmNewPassword;
            (document.getElementById('confirmNewPassword') as HTMLInputElement).type = this.showConfirmNewPassword ? 'text' : 'password';
            this.toggleEyeIcon(showConfirmNewPasswordSpan, this.showConfirmNewPassword);
          });
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const { oldPassword, newPassword, confirmNewPassword } = result.value as any;
        if (showOldPassword && !oldPassword) { Swal.fire('Error', 'Current Password is required', 'error'); return; }
        if (newPassword.length < 6) { Swal.fire('Error', 'New password must be at least 6 characters', 'error'); return; }
        if (newPassword !== confirmNewPassword) { Swal.fire('Error', 'New passwords do not match', 'error'); return; }

        const payload = { userId: this.teacherId, oldPassword: oldPassword, newPassword: newPassword };
        this.authService.changePassword(payload).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
          next: () => Swal.fire('Success', 'Password changed successfully!', 'success'),
          error: (error) => Swal.fire('Error', error.error || 'Failed to change password', 'error')
        });
      }
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmNewPassword = formGroup.get('confirmNewPassword')?.value;
    return newPassword === confirmNewPassword ? null : { passwordMismatch: true };
  }

  private toggleEyeIcon(span: HTMLElement, showing: boolean): void {
    (span.children[0] as HTMLElement).style.display = showing ? '' : 'none';
    (span.children[1] as HTMLElement).style.display = showing ? 'none' : '';
  }
}