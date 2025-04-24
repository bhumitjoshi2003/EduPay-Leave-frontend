import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service'; // Adjust the service as needed
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

interface StudentDetails { // Or TeacherDetails, keep them separate
  studentId?: string;  // Or teacherId
  name?: string;
  className?: string; // Or other relevant properties
  phoneNumber?: string;
  email?: string;
  gender?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
}

@Component({
  selector: 'app-student-details', // Or app-teacher-details
  imports: [CommonModule, FormsModule],
  templateUrl: './student-details.component.html', // Or ./teacher-details.component.html
  styleUrl: './student-details.component.css' // Or ./teacher-details.component.css
})
export class StudentDetailsComponent implements OnInit, OnDestroy { //  Or TeacherDetailsComponent
  studentId: string = ''; // Or teacherId
  studentDetails: StudentDetails | null = null; // Or TeacherDetails
  role: string = '';
  isEditing: boolean = false;
  updatedDetails: StudentDetails | null = null;
  changePasswordForm: FormGroup;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private studentService: StudentService, // Or TeacherService
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.changePasswordForm = this.fb.group({
      oldPassword: [''], // Removed Validators.required here
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.ngUnsubscribe)).subscribe((params) => {
      this.studentId = params['studentId']; // Or teacherId
      if (this.studentId) {
        this.loadStudentDetails(this.studentId); // Or loadTeacherDetails
      }
    });
    this.role = this.authService.getUserRole();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  loadStudentDetails(studentId: string): void { // Or loadTeacherDetails
    this.studentService.getStudent(studentId).pipe(takeUntil(this.ngUnsubscribe)).subscribe({ // Or TeacherService
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
    this.updatedDetails = { ...this.studentDetails! }; // Or this.teacherDetails!
    Swal.fire({
      icon: 'info',
      title: 'Cancelled',
      text: 'Edit mode cancelled. No changes saved.',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  saveStudentDetails(): void { // Or saveTeacherDetails
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
          this.studentService.updateStudent(this.studentId, this.updatedDetails).pipe(takeUntil(this.ngUnsubscribe)).subscribe({ // Or TeacherService
            next: (response) => {
              console.log('Details updated successfully:', response);
              this.studentDetails = { ...this.updatedDetails }; // Or this.teacherDetails
              this.isEditing = false;
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
      this.updatedDetails[field] = event.target.value;
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

  viewFeeDetails(): void{ 
     this.router.navigate(['/dashboard/fees', this.studentId]);
  }

  changePassword(): void {
    const userRole = this.getUserRole();
    const showOldPassword = (userRole !== 'ADMIN'); 

    Swal.fire({
      title: 'Change Password',
      html:
        `<div class="change-password-form">
          ${showOldPassword ? `<input id="oldPassword" type="password" class="swal2-input" placeholder="Current Password">` : ''}
          <input id="newPassword" type="password" class="swal2-input" placeholder="New Password">
          <input id="confirmNewPassword" type="password" class="swal2-input" placeholder="Confirm New Password">
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
}

