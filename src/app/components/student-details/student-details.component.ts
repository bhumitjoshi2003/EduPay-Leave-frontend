import { Component, OnInit } from '@angular/core';
 import { ActivatedRoute, Router } from '@angular/router';
 import { StudentService } from '../../services/student.service';
 import { CommonModule } from '@angular/common';

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

   constructor(
     private route: ActivatedRoute,
     public router: Router,
     private studentService: StudentService
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

   viewAttendance(): void {
     this.router.navigate(['/dashboard/student-attendance', this.studentId]);
   }
 }