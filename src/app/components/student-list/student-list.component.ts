import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { Router } from '@angular/router';
import { AuthStateService } from '../../auth/auth-state.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { LoggerService } from '../../services/logger.service';
import { SchoolService } from '../../services/school.service';

interface Student {
  studentId: string;
  name: string;
}

@Component({
  selector: 'app-student-list',
  imports: [CommonModule],
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class StudentListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  activeStudents: Student[] = [];
  newStudents: Student[] = [];
  inactiveStudents: Student[] = [];
  teacherId: string = '';
  loggedInUserRole: string = '';
  selectedClass: string = '';
  classList: string[] = [];

  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private router: Router,
    private authStateService: AuthStateService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private schoolService: SchoolService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.getUserRoleAndLoadData();
  }

  getUserRoleAndLoadData(): void {
    const user = this.authStateService.getUser();
    if (user) {
      this.loggedInUserRole = user.role;
      this.teacherId = user.userId;

      if (this.loggedInUserRole === 'ADMIN') {
        this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
          next: classes => {
            this.classList = classes;
            this.selectedClass = localStorage.getItem('lastSelectedClass') || this.classList[0];
            this.cdr.markForCheck();
            this.loadStudents();
          },
          error: () => {}
        });
      } else if (this.loggedInUserRole === 'TEACHER') {
        this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
          next: classes => { this.classList = classes; this.cdr.markForCheck(); },
          error: () => {}
        });
        this.getTeacherClassAndLoadStudents();
      }
    } else {
    }
  }

  getTeacherClassAndLoadStudents(): void {
    this.teacherService.getTeacher(this.teacherId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (teacher: any) => {
        this.selectedClass = teacher.classTeacher;
        this.loadStudents();
      },
      error: (error: any) => {
        this.logger.error('Error fetching teacher details:', error);
      }
    });
  }

  loadStudents(): void {
    const classAtRequest = this.selectedClass;
    localStorage.setItem('lastSelectedClass', classAtRequest);

    this.studentService.getActiveStudentsByClass(classAtRequest).pipe(takeUntil(this.destroy$)).subscribe((students) => {
      if (this.selectedClass !== classAtRequest) return;
      this.activeStudents = students;
      this.cdr.markForCheck();
    });

    if (this.loggedInUserRole === 'ADMIN') {
      this.studentService.getNewStudentsByClass(classAtRequest).pipe(takeUntil(this.destroy$)).subscribe((students) => {
        if (this.selectedClass !== classAtRequest) return;
        this.newStudents = students;
        this.cdr.markForCheck();
      });
      this.studentService.getInactiveStudentsByClass(classAtRequest).pipe(takeUntil(this.destroy$)).subscribe((students) => {
        if (this.selectedClass !== classAtRequest) return;
        this.inactiveStudents = students;
        this.cdr.markForCheck();
      });
    }
  }

  viewStudentDetails(studentId: string): void {
    this.router.navigate(['/dashboard/student-details', studentId]);
  }

  trackByStudentId(index: number, student: Student): string { return student.studentId; }
  trackByClass(index: number, className: string): string { return className; }

  onClassSelect(selectedClass: string): void {
    this.selectedClass = selectedClass;
    this.loadStudents();
  }

  navigateToBulkImport(): void {
    this.router.navigate(['/dashboard/student-bulk-import']);
  }
}