import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import Swal from 'sweetalert2'; // Import SweetAlert

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
}

@Component({
  selector: 'app-student-details',
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.css'
})

export class StudentDetailsComponent implements OnInit {

  studentId: string = '';
  studentDetails: StudentDetails | null = null;
  role: string = '';
  isEditing: boolean = false;
  updatedDetails: StudentDetails | null = null; // To hold the edited data

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private studentService: StudentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.studentId = params['studentId'];
      if (this.studentId) {
        this.loadStudentDetails(this.studentId);
      }
    });
  }

  loadStudentDetails(studentId: string): void {
    this.studentService.getStudent(studentId).subscribe({
      next: (details) => {
        this.studentDetails = details;
        this.updatedDetails = { ...details };
      },
      error: (error) => {
        console.error('Error fetching student details:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load student details.',
        });
      }
    });
  }

  getUserRole(): string {
    return this.authService.getUserRole();
  }

  enableEditMode(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to edit the student details?',
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
    Swal.fire({
      icon: 'info',
      title: 'Cancelled',
      text: 'Edit mode cancelled. No changes saved.',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  saveStudentDetails(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to save the changes to the student details?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, save it!',
    }).then((result) => {
      if (result.isConfirmed) {
        if (this.updatedDetails) {
          this.studentService.updateStudent(this.studentId, this.updatedDetails).subscribe({
            next: (response) => {
              console.log('Student details updated successfully:', response);
              this.studentDetails = { ...this.updatedDetails };
              this.isEditing = false;
              Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Student details have been updated.',
                timer: 1500,
                showConfirmButton: false,
              });
            },
            error: (error) => {
              console.error('Error updating student details:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: 'Failed to update student details.',
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

  viewFeeDetails(): void {
    this.router.navigate(['/dashboard/fees', this.studentId]);
  }
}