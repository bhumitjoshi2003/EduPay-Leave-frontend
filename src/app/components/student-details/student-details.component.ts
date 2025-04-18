import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentService } from '../../services/student.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

interface StudentDetails {
  studentId: string;
  name: string;
  className: string;
  phoneNumber: string;
  email: string;
  gender: string;
  dob: string;
  fatherName: string;
  motherName: string;
}

@Component({
  selector: 'app-student-details',
  imports: [CommonModule],
  templateUrl: './student-details.component.html',
  styleUrl: './student-details.component.css'
})

export class StudentDetailsComponent implements OnInit {

  studentId: string = '';
  studentDetails: StudentDetails | null = null;
  role: string = '';

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
      },
      error: (error) => {
        console.error('Error fetching student details:', error);
      }
    });
  }

  getUserRole(): string {
    return this.authService.getUserRole();
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