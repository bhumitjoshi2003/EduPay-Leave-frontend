import { Component, OnInit, OnDestroy } from '@angular/core';
import { TeacherService } from '../../services/teacher.service';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

interface Teacher {
  teacherId: string;
  name: string;
  phoneNumber?: string;
}

@Component({
  selector: 'app-teacher-list',
  imports: [CommonModule],
  templateUrl: './teacher-list.component.html',
  styleUrl: './teacher-list.component.css'
})
export class TeacherListComponent implements OnInit, OnDestroy {
  teachers: Teacher[] = [];
  loggedInUserRole: string = '';
  private ngUnsubscribe = new Subject<void>();

  constructor(
    private teacherService: TeacherService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.getUserRoleAndLoadTeachers();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  getUserRoleAndLoadTeachers(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.loggedInUserRole = decodedToken.role;

      if (this.loggedInUserRole === 'ADMIN') {
        this.loadAllTeachers();
      } else {
        console.warn('Non-admin user trying to access teacher list.');
        this.router.navigate(['/dashboard']);
      }
    } else {
      console.error('No token found');
      this.router.navigate(['/login']);
    }
  }

  loadAllTeachers(): void {
    this.teacherService.getAllTeachers().pipe(takeUntil(this.ngUnsubscribe)).subscribe({
      next: (teachers) => {
        this.teachers = teachers;
      },
      error: (error) => {
        console.error('Error fetching all teachers:', error);
      }
    });
  }

  viewTeacherDetails(teacherId: string): void {
    this.router.navigate(['/dashboard/teacher-details', teacherId]);
  }
}