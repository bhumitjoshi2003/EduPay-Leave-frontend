import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { Router } from '@angular/router';
import { AuthStateService } from '../../auth/auth-state.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { LoggerService } from '../../services/logger.service';
import { ToastService } from '../../services/toast.service';
import { SchoolService, SchoolClass } from '../../services/school.service';
import { SectionService } from '../../services/section.service';
import { Section } from '../../interfaces/section';

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
  managedClasses: SchoolClass[] = [];
  sections: Section[] = [];
  selectedSectionId: number | null = null;

  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private router: Router,
    private authStateService: AuthStateService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private schoolService: SchoolService,
    private sectionService: SectionService
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
        this.schoolService.getManagedClasses().pipe(takeUntil(this.destroy$)).subscribe({
          next: classes => { this.managedClasses = classes; },
          error: () => {}
        });
        this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
          next: classes => {
            this.classList = classes;
            this.selectedClass = localStorage.getItem('lastSelectedClass') || this.classList[0];
            this.cdr.markForCheck();
            if (this.selectedClass) this.loadSectionsForClass(this.selectedClass);
            this.loadStudents();
          },
          error: (err) => {
            this.logger.error('Failed to load classes:', err);
            this.toast.error('Error', 'Failed to load class list.');
          }
        });
      } else if (this.loggedInUserRole === 'TEACHER') {
        this.schoolService.getClasses().pipe(takeUntil(this.destroy$)).subscribe({
          next: classes => { this.classList = classes; this.cdr.markForCheck(); },
          error: (err) => {
            this.logger.error('Failed to load classes:', err);
            this.toast.error('Error', 'Failed to load class list.');
          }
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
    const secId = this.selectedSectionId ?? undefined;

    this.studentService.getActiveStudentsByClass(classAtRequest, secId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (students) => {
        if (this.selectedClass !== classAtRequest) return;
        this.activeStudents = students;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Failed to load students:', err);
        this.toast.error('Error', 'Failed to load student list.');
      }
    });

    if (this.loggedInUserRole === 'ADMIN') {
      this.studentService.getNewStudentsByClass(classAtRequest, secId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (students) => {
          if (this.selectedClass !== classAtRequest) return;
          this.newStudents = students;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load upcoming students:', err);
          this.toast.error('Error', 'Failed to load student list.');
        }
      });
      this.studentService.getInactiveStudentsByClass(classAtRequest, secId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (students) => {
          if (this.selectedClass !== classAtRequest) return;
          this.inactiveStudents = students;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load inactive students:', err);
          this.toast.error('Error', 'Failed to load student list.');
        }
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
    this.selectedSectionId = null;
    this.sections = [];
    this.loadSectionsForClass(selectedClass);
    this.loadStudents();
  }

  loadSectionsForClass(className: string): void {
    const cls = this.managedClasses.find(c => c.name === className);
    if (!cls) return;
    this.sectionService.getSectionsForClass(cls.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: sections => { this.sections = sections; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  onSectionSelect(sectionId: number | null): void {
    this.selectedSectionId = sectionId;
    this.loadStudents();
  }

  navigateToBulkImport(): void {
    this.router.navigate(['/dashboard/student-bulk-import']);
  }
}
