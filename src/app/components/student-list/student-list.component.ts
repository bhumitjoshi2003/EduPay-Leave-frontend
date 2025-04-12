import { Component, OnInit } from '@angular/core';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';

interface Student {
  studentId: string;
  name: string;
}

@Component({
  selector: 'app-student-list',
  imports: [CommonModule],
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.css'
})

export class StudentListComponent implements OnInit {
  students: Student[] = [];
  teacherId: string = '';
  selectedClass: string = '';

  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getTeacherClassAndLoadStudents();
  }

  getTeacherClassAndLoadStudents(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.teacherId = decodedToken.userId;
      this.teacherService.getTeacher(this.teacherId).subscribe({
        next: (teacher: any) => {
          this.selectedClass = teacher.classTeacher;
          this.loadStudents();
        },
        error: (error: any) => {
          console.error('Error fetching teacher details:', error);
        }
      });
    }
  }

  loadStudents(): void {
    this.studentService.getStudentsByClass(this.selectedClass).subscribe((students) => {
      this.students = students;
    });
  }

  viewStudentDetails(studentId: string): void {
    console.log("sid: " + studentId);
    this.router.navigate(['/dashboard/student-details', studentId]);
  }
}