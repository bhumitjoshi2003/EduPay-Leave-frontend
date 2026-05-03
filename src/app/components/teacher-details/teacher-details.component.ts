import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { LoggerService } from '../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TeacherService } from '../../services/teacher.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

interface TeacherDetails {
  teacherId?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  dob?: string;
  classTeacher?: string | null;
  photoUrl?: string;
}

@Component({
  selector: 'app-teacher-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-details.component.html',
  styleUrl: './teacher-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherDetailsComponent implements OnInit, OnDestroy {
  teacherId: string = '';
  teacherDetails: TeacherDetails | null = null;
  role: string = '';
  isEditing: boolean = false;
  updatedDetails: TeacherDetails | null = null;
  private ngUnsubscribe = new Subject<void>();

  // Photo upload state
  photoUploading = false;
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  // Change-password modal state
  showPasswordModal = false;
  cpOldPw = '';
  cpNewPw = '';
  cpConfirmPw = '';
  cpShowOld = false;
  cpShowNew = false;
  cpShowConfirm = false;
  cpShowOldField = false;

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
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) { }

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
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.logger.error('Error fetching teacher details:', error);
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
      confirmButtonColor: '#1e3a5f',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, edit it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.isEditing = true;
        this.cdr.markForCheck();
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
      confirmButtonColor: '#1e3a5f',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, save it!',
    }).then((result) => {
      if (result.isConfirmed) {
        if (this.updatedDetails) {
          this.teacherService.updateTeacher(this.teacherId, this.updatedDetails).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
            next: (response) => {
              this.teacherDetails = { ...this.updatedDetails };
              this.isEditing = false;
              this.cdr.markForCheck();
              Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Teacher details have been updated.',
                timer: 1500,
                showConfirmButton: false,
              });
            },
            error: (error) => {
              this.logger.error('Error updating teacher details:', error);
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

  canUploadPhoto(): boolean {
    const role = this.getUserRole();
    if (role === 'ADMIN' || role === 'SUB_ADMIN' || role === 'SUPER_ADMIN') return true;
    if (role === 'TEACHER') return this.authService.getUserId() === this.teacherId;
    return false;
  }

  getInitials(): string {
    return this.teacherDetails?.name?.charAt(0).toUpperCase() ?? '?';
  }

  getPhotoUrl(relativePath: string): string {
    if (relativePath.startsWith('http')) return relativePath;
    return `${environment.apiUrl}${relativePath}`;
  }

  triggerPhotoUpload(): void {
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    input.value = '';

    this.photoUploading = true;
    this.cdr.markForCheck();

    this.teacherService.uploadTeacherPhoto(this.teacherId, file).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
      next: (res) => {
        if (this.teacherDetails) {
          this.teacherDetails = { ...this.teacherDetails, photoUrl: res.photoUrl + '?t=' + Date.now() };
        }
        this.photoUploading = false;
        this.cdr.markForCheck();
        Swal.fire({ icon: 'success', title: 'Photo updated!', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        this.logger.error('Photo upload error:', err);
        this.photoUploading = false;
        this.cdr.markForCheck();
        Swal.fire({ icon: 'error', title: 'Upload failed', text: 'Could not upload photo. Please try again.' });
      }
    });
  }

  goBackToTeacherList(): void {
    this.router.navigate(['/dashboard/teacher-list']);
  }

  openPasswordModal(): void {
    this.cpOldPw = '';
    this.cpNewPw = '';
    this.cpConfirmPw = '';
    this.cpShowOld = false;
    this.cpShowNew = false;
    this.cpShowConfirm = false;
    this.cpShowOldField = (this.role !== 'ADMIN');
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  submitPasswordChange(): void {
    if (this.cpShowOldField && !this.cpOldPw) {
      Swal.fire('Error', 'Current password is required', 'error');
      return;
    }
    if (!this.cpNewPw || !this.cpConfirmPw) {
      Swal.fire('Error', 'New password and confirmation are required', 'error');
      return;
    }
    if (this.cpNewPw.length < 6) {
      Swal.fire('Error', 'New password must be at least 6 characters', 'error');
      return;
    }
    if (this.cpNewPw !== this.cpConfirmPw) {
      Swal.fire('Error', 'New passwords do not match', 'error');
      return;
    }
    const payload = { userId: this.teacherId, oldPassword: this.cpOldPw, newPassword: this.cpNewPw };
    this.authService.changePassword(payload).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
      next: () => {
        this.closePasswordModal();
        Swal.fire('Success', 'Password changed successfully!', 'success');
      },
      error: (error) => {
        this.logger.error('Error changing password', error);
        Swal.fire('Error', error.error || 'Failed to change password', 'error');
      }
    });
  }
}