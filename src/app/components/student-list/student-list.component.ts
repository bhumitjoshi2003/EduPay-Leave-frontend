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
  activeStudents: Student[] = [];
  newStudents: Student[] = [];
  inactiveStudents: Student[] = [];
  teacherId: string = '';
  loggedInUserRole: string = '';
  selectedClass: string = '';
  classList: string[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
  ];

  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.getUserRoleAndLoadData();
  }

  getUserRoleAndLoadData(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.loggedInUserRole = decodedToken.role;
      this.teacherId = decodedToken.userId;

      if (this.loggedInUserRole === 'ADMIN') {
        this.selectedClass = localStorage.getItem('lastSelectedClass')! ? localStorage.getItem('lastSelectedClass')! : this.classList[0];
        this.loadStudents();
      } else if (this.loggedInUserRole === 'TEACHER') {
        this.getTeacherClassAndLoadStudents();
      }
    } else {
      console.error('No token found');
      this.router.navigate(['/login']);
    }
  }

  getTeacherClassAndLoadStudents(): void {
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

  loadStudents(): void {
    this.studentService.getActiveStudentsByClass(this.selectedClass).subscribe((students) => {
      this.activeStudents = students;
    });
    if (this.loggedInUserRole === 'ADMIN') {
      console.log("admin");
      this.studentService.getNewStudentsByClass(this.selectedClass).subscribe((students) => {
        this.newStudents = students;
      });
      this.studentService.getInactiveStudentsByClass(this.selectedClass).subscribe((students) => {
        this.inactiveStudents = students;
      });
    }
    localStorage.setItem('lastSelectedClass', this.selectedClass);
  }

  viewStudentDetails(studentId: string): void {
    this.router.navigate(['/dashboard/student-details', studentId]);
  }

  onClassSelect(selectedClass: string): void {
    this.selectedClass = selectedClass;
    this.loadStudents();
  }
}