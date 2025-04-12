import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LeaveService } from '../../services/leave.service';
import { StudentService } from '../../services/student.service';
import Swal from 'sweetalert2';
import { LeaveRequest } from '../../interfaces/leave-request';
import { jwtDecode } from 'jwt-decode';

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
  className = '';
  leaves: { originalLeaveDate: string; leaveDate: string; reason: string }[] = [];
  today: string = '';

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private studentService: StudentService
  ) {
    this.leaveForm = this.fb.group({
      leaveDate: ['', Validators.required],
      reason: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const today = new Date();
    this.today = formatDate(today, 'yyyy-MM-dd', 'en');
    this.getStudentId();
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
    this.leaveService.getStudentLeaves(this.studentId).subscribe((data) => {
      this.leaves = data
        .sort((a, b) => new Date(b.leaveDate).getTime() - new Date(a.leaveDate).getTime())
        .map((leave) => ({
          originalLeaveDate: leave.leaveDate, 
          leaveDate: formatDate(leave.leaveDate, 'dd-MMM-yyyy', 'en'), 
          reason: leave.reason
        }));
    });
  }

  deleteLeave(leaveDate: string): void {
    if (leaveDate) {
      const formattedLeaveDate = new Date(leaveDate).toISOString().split('T')[0];

      this.leaveService.deleteLeave(this.studentId, formattedLeaveDate).subscribe({
        next: () => {
          this.leaveForm.reset();
          Swal.fire({
            title: 'Leave Deleted!',
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
  }

  check(): void{
    if (this.leaveForm.get('leaveDate')?.hasError('required') && this.leaveForm.get('reason')?.hasError('required')){
      this.errorMessage = "Please choose a date and reason.";
    } else if (this.leaveForm.get('leaveDate')?.hasError('required')) {
      this.errorMessage = "Please choose a date.";
    } else if (this.leaveForm.get('reason')?.hasError('required')) {
      this.errorMessage = "Please provide a reason.";
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

      const leaveExists = this.leaves.some(
        (leave) => leave.leaveDate === formattedLeaveDate
      );

      if (leaveExists) {
        this.errorMessage = 'Leave already applied for this date!';
        return;
      }


      const leaveRequest: LeaveRequest = {
        studentId: this.studentId,
        leaveDate: formattedLeaveDate,
        reason: this.leaveForm.get('reason')?.value,
        className: this.className,
      };

      this.leaveService.applyLeave(leaveRequest).subscribe({
        next: (response) => {
          this.leaveForm.reset();
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
      
    }
  }
}