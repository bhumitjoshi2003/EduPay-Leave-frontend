import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

interface StudentDetails {
  studentId?: string;
  name?: string;
  className?: string;
  phoneNumber?: string;
  email?: string;
  gender?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  takesBus?: boolean;
  distance?: number | null;
}

@Component({
  selector: 'app-student-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.css'
})
export class StudentDetailsComponent implements OnInit, OnDestroy {
  studentId: string = '';
  studentDetails: StudentDetails | null = null;
  role: string = '';
  isEditing: boolean = false;
  updatedDetails: StudentDetails | null = null;
  changePasswordForm: FormGroup;
  private ngUnsubscribe = new Subject<void>();
  showOldPassword = false;
  showNewPassword = false;
  showConfirmNewPassword = false;
  effectiveFromMonth: number | null = null; // To store the selected month
  academicMonths = [
    { value: 0, label: 'New Academic Year' }, 
    { value: 1, label: 'April' }, { value: 2, label: 'May' }, { value: 3, label: 'June' },
    { value: 4, label: 'July' }, { value: 5, label: 'August' }, { value: 6, label: 'September' },
    { value: 7, label: 'October' }, { value: 8, label: 'November' }, { value: 9, label: 'December' },
    { value: 10, label: 'January' }, { value: 11, label: 'February' }, { value: 12, label: 'March' }
  ];
  private readonly eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  private readonly eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M17.94 17.94A10.01 10.01 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M15 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/><path d="M3 3l18 18"/></svg>`;


  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private studentService: StudentService,
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
    this.route.params.pipe(takeUntil(this.ngUnsubscribe)).subscribe((params) => {
      this.studentId = params['studentId'];
      if (this.studentId) {
        this.loadStudentDetails(this.studentId);
      }
    });
    this.role = this.authService.getUserRole();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  loadStudentDetails(studentId: string): void {
    this.studentService.getStudent(studentId).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
      next: (details) => {
        this.studentDetails = details;
        this.updatedDetails = { ...details };
      },
      error: (error) => {
        console.error('Error fetching details:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load details.',
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
      text: 'Do you want to edit the details?',
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
    this.updatedDetails = { ...this.studentDetails! };
    this.effectiveFromMonth = null; 
    Swal.fire({
      icon: 'info',
      title: 'Cancelled',
      text: 'Edit mode cancelled. No changes saved.',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  async saveStudentDetails(): Promise<void> {
    let needsEffectiveMonth = false;

    if (this.updatedDetails && this.studentDetails) {
      if (this.updatedDetails.takesBus !== this.studentDetails.takesBus) {
        needsEffectiveMonth = true;
      } else if (this.updatedDetails.takesBus && this.studentDetails.takesBus && this.updatedDetails.distance !== this.studentDetails.distance) {
        needsEffectiveMonth = true;
      }
    }


    if (needsEffectiveMonth) {
      const { value: month } = await Swal.fire({
        title: 'Select Effective Month',
        input: 'select',
        inputOptions: this.academicMonths.reduce((obj: { [key: number]: string }, item) => {
          obj[item.value] = item.label;
          return obj;
        }, {}),
        inputPlaceholder: 'Select Month',
        showCancelButton: true,
        confirmButtonText: 'Save with Selected Month',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          return !value && 'You need to select a month!';
        },
      });

      if (month) {
        this.effectiveFromMonth = parseInt(month, 10);
        this.executeUpdate();
      }
    } else {
      this.executeUpdate();
    }
  }

  executeUpdate(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to save the changes to the details?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, save it!',
    }).then((result) => {
      if (result.isConfirmed) {
        if (this.updatedDetails) {
          const payload = {
            studentDetails: this.updatedDetails,
            effectiveFromMonth: this.effectiveFromMonth
          };
          this.studentService.updateStudent(this.studentId, payload).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
            next: (response) => {
              console.log('Details updated successfully:', response);
              this.studentDetails = { ...this.updatedDetails };
              this.isEditing = false;
              this.effectiveFromMonth = null;
              Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Details have been updated.',
                timer: 1500,
                showConfirmButton: false,
              });
            },
            error: (error) => {
              console.error('Error updating details:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: 'Failed to update details.',
              });
            }
          });
        }
      }
    });
  }

  updateFieldValue(field: keyof StudentDetails, event: any): void {
    if (this.updatedDetails) {
      this.updatedDetails[field] = (field === 'takesBus') ? event.target.checked : event.target.value;
    }
  }

  viewAttendance(): void {
    this.router.navigate(['/dashboard/student-attendance', this.studentId]);
  }

  viewPaymentHistory(): void {
    this.router.navigate(['/dashboard/payment-history', this.studentId]);
  }

  viewLeaves(): void {
    this.router.navigate(['/dashboard/view-leaves', this.studentId]);
  }

  viewFeeDetails(): void {
    this.router.navigate(['/dashboard/fees', this.studentId]);
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
          userId: this.studentId,
          oldPassword: oldPassword,
          newPassword: newPassword
        };

        this.authService.changePassword(payload).subscribe({
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