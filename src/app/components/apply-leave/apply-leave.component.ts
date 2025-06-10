import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LeaveService } from '../../services/leave.service';
import { StudentService } from '../../services/student.service';
import Swal from 'sweetalert2';
import { LeaveRequest } from '../../interfaces/leave-request';
import { jwtDecode } from 'jwt-decode';
import { PaginatedResponse } from '../../services/payment-history.service';

@Component({
  selector: 'app-apply-leave',
  templateUrl: './apply-leave.component.html',
  styleUrls: ['./apply-leave.component.css'],
  imports: [ReactiveFormsModule, CommonModule],
})
export class ApplyLeaveComponent implements OnInit {
  leaveForm: FormGroup;
  errorMessage: string = '';
  studentId: string = '';
  studentName: string = '';
  className = '';
  leaves: { originalLeaveDate: string; leaveDate: string; reason: string }[] = [];

  // Pagination
  currentPage: number = 0;
  pageSize: number = 5;
  totalPages: number = 0;
  totalElements: number = 0;

  today: string = '';
  reasonOptions: string[] = [
    'Medical Leave',
    'Family Event',
    'Personal Work',
    'Travel',
    'Others',
  ];
  showOtherReasonInput: boolean = false;

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private studentService: StudentService
  ) {
    this.leaveForm = this.fb.group({
      leaveDate: ['', Validators.required],
      reason: ['', Validators.required],
      otherReason: ['', Validators.maxLength(20)],
    });
  }

  ngOnInit(): void {
    const today = new Date();
    this.today = formatDate(today, 'yyyy-MM-dd', 'en');
    this.getStudentId();
  }

  get reasonControl() {
    return this.leaveForm.get('reason');
  }

  get otherReasonControl() {
    return this.leaveForm.get('otherReason');
  }

  onReasonChange(): void {
    this.showOtherReasonInput = this.reasonControl?.value === 'Others';
    if (this.showOtherReasonInput) {
      this.otherReasonControl?.setValidators([Validators.required, Validators.maxLength(20)]);
    } else {
      this.otherReasonControl?.clearValidators();
    }
    this.otherReasonControl?.updateValueAndValidity();
  }

  getStudentId(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.studentId = decodedToken.userId;
      this.studentService.getStudent(this.studentId).subscribe({
        next: (student) => {
          this.className = student.className;
          this.loadStudentLeaves();
        },
        error: (error) => {
          console.error('Error fetching student details:', error);
        }
      });
    }
  }

  loadStudentLeaves(): void {
    this.leaveService.getLeavesByStudentId(this.studentId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response: PaginatedResponse<any>) => {
          this.leaves = response.content.map((leave: any) => ({
            originalLeaveDate: leave.leaveDate,
            leaveDate: leave.leaveDate,
            reason: leave.reason,
          }));
          this.totalPages = response.totalPages;
          this.totalElements = response.totalElements;
        },
        error: (error) => {
          console.error('Error fetching student leaves:', error);
        }
      });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadStudentLeaves();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadStudentLeaves();
    }
  }

  deleteLeave(leaveDate: string): void {
    if (leaveDate) {
      Swal.fire({
        title: 'Are you sure?',
        text: 'You will not be able to recover this leave!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
      }).then((result) => {
        if (result.isConfirmed) {
          const formattedLeaveDate = new Date(leaveDate).toISOString().split('T')[0];

          this.leaveService.deleteLeave(this.studentId, formattedLeaveDate).subscribe({
            next: () => {
              this.leaveForm.reset();
              this.reasonControl?.setValue('');
              this.showOtherReasonInput = false;
              Swal.fire({
                title: 'Deleted!',
                text: 'Your leave has been deleted.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
              });
              this.ngOnInit();
            },
            error: (error) => {
              console.error('Error deleting leave:', error);
              Swal.fire({
                title: 'Error!',
                text: 'Failed to delete leave. Please try again.',
                icon: 'error',
                timer: 2000,
                showConfirmButton: false,
              });
            },
          });
        }
      });
    }
  }

  check(): void {
    if (this.leaveForm.get('leaveDate')?.hasError('required')) {
      this.errorMessage = "Please choose a date.";
    } else if (this.reasonControl?.hasError('required')) {
      this.errorMessage = "Please select a reason.";
    } else if (this.showOtherReasonInput && this.otherReasonControl?.hasError('required')) {
      this.errorMessage = "Please provide a reason.";
    } else if (this.otherReasonControl?.hasError('maxlength')) {
      this.errorMessage = "Reason cannot be more than 20 words.";
    } else {
      this.errorMessage = "";
    }
  }

  applyLeave(): void {
    if (this.leaveForm.invalid) {
      this.check();
      return;
    }

    if (this.leaveForm.valid) {
      const now = new Date();
      const leaveDate = new Date(this.leaveForm.get('leaveDate')?.value);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sixAMToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0);

      this.errorMessage = '';

      if (leaveDate < today) {
        this.errorMessage = 'Leave cannot be applied for past dates!';
        return;
      }

      if (leaveDate.toDateString() === today.toDateString() && now >= sixAMToday) {
        this.errorMessage = 'Leave for today must be applied before 6:00 AM!';
        return;
      }

      if (leaveDate.getDay() === 0) {
        this.errorMessage = 'Even the server takes Sundays off. Please choose another day!';
        return;
      }

      const formattedLeaveDate = leaveDate.toISOString().split('T')[0];
      const selectedReason = this.reasonControl?.value;
      let finalReason = selectedReason;

      if (selectedReason === 'Others') {
        finalReason = this.otherReasonControl?.value;
      }

      const leaveExists = this.leaves.some(
        (leave) => leave.originalLeaveDate === formattedLeaveDate
      );

      if (leaveExists) {
        this.errorMessage = 'Leave already applied for this date!';
        return;
      }

      this.studentService.getStudent(this.studentId).subscribe({
        next: (response) => {
          this.studentName = response.name;

          const leaveRequest: LeaveRequest = {
            studentId: this.studentId,
            studentName: this.studentName,
            leaveDate: formattedLeaveDate,
            reason: finalReason,
            className: this.className,
          };

          this.leaveService.applyLeave(leaveRequest).subscribe({
            next: (response) => {
              this.leaveForm.reset();
              this.reasonControl?.setValue('');
              this.leaveForm.get('leaveDate')?.setValue('');
              this.showOtherReasonInput = false;
              Swal.fire({
                title: 'Leave Applied!',
                text: response,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
              });
              this.ngOnInit();
            },
            error: (error) => {
              console.error('Error applying leave:', error);
              this.errorMessage = 'Failed to apply leave. Please try again.';
              Swal.fire({
                title: 'Error!',
                text: this.errorMessage,
                icon: 'error',
                timer: 2000,
                showConfirmButton: false,
              });
            },
          });
        },
        error: (error) => {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to retrieve student information. Please try again.',
            icon: 'error',
            timer: 2000,
            showConfirmButton: false,
          });
        }
      });
    }
  }
}