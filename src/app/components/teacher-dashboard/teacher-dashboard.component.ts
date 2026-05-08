import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthStateService } from '../../auth/auth-state.service';
import { TeacherService } from '../../services/teacher.service';
import { StudentService } from '../../services/student.service';
import { AttendanceService } from '../../services/attendance.service';
import { LeaveService, LeaveApplication } from '../../services/leave.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  teacherName = '';
  className = '';
  isClassTeacher = false;
  isLoading = true;
  today = new Date();

  totalStudents = 0;
  todayAbsent = 0;
  attendanceTaken = false;
  pendingLeavesCount = 0;
  monthlyAttendanceRate = 0;
  recentLeaves: LeaveApplication[] = [];

  constructor(
    private authState: AuthStateService,
    private teacherService: TeacherService,
    private studentService: StudentService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authState.getUser();
    if (!user) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.teacherService
      .getTeacher(user.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teacher) => {
          this.teacherName = teacher.name;
          this.className = teacher.classTeacher ?? '';
          this.isClassTeacher = !!teacher.classTeacher;
          this.cdr.markForCheck();

          if (this.isClassTeacher) {
            this.loadClassData();
          } else {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          this.logger.error('Failed to load teacher', err);
          this.isLoading = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to load teacher profile.', 'error');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadClassData(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    forkJoin({
      students: this.studentService.getActiveStudentsByClass(this.className),
      absentToday: this.attendanceService.getAttendanceByDateAndClass(todayStr, this.className),
      leaves: this.leaveService.getLeavesPaginated(0, 50, this.className),
      summary: this.attendanceService.getClassSummary(this.className, { year, month }),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ students, absentToday, leaves, summary }) => {
          this.totalStudents = students.length;
          this.attendanceTaken = absentToday.length > 0;
          this.todayAbsent = absentToday.length;

          const pending = leaves.content.filter((l) => l.status === 'PENDING');
          this.pendingLeavesCount = pending.length;
          this.recentLeaves = pending.slice(0, 10);

          if (summary.length > 0) {
            const total = summary.reduce((sum, s) => sum + s.attendancePercentage, 0);
            this.monthlyAttendanceRate = total / summary.length;
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load class data', err);
          this.isLoading = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to load class data.', 'error');
        },
      });
  }

  approveLeave(leaveId: number): void {
    this.leaveService
      .updateLeaveStatus(leaveId, 'APPROVED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recentLeaves = this.recentLeaves.filter((l) => l.id !== leaveId);
          this.pendingLeavesCount = Math.max(0, this.pendingLeavesCount - 1);
          this.cdr.markForCheck();
          Swal.fire({ icon: 'success', title: 'Approved', timer: 1500, showConfirmButton: false });
        },
        error: (err) => {
          this.logger.error('Approve failed', err);
          Swal.fire('Error', 'Failed to approve leave.', 'error');
        },
      });
  }

  rejectLeave(leaveId: number): void {
    this.leaveService
      .updateLeaveStatus(leaveId, 'REJECTED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recentLeaves = this.recentLeaves.filter((l) => l.id !== leaveId);
          this.pendingLeavesCount = Math.max(0, this.pendingLeavesCount - 1);
          this.cdr.markForCheck();
          Swal.fire({ icon: 'info', title: 'Rejected', timer: 1500, showConfirmButton: false });
        },
        error: (err) => {
          this.logger.error('Reject failed', err);
          Swal.fire('Error', 'Failed to reject leave.', 'error');
        },
      });
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get attendanceColor(): string {
    if (this.monthlyAttendanceRate >= 85) return '#059669';
    if (this.monthlyAttendanceRate >= 70) return '#d97706';
    return '#dc2626';
  }

  get todayPresentCount(): number {
    return Math.max(0, this.totalStudents - this.todayAbsent);
  }

  get absentCardState(): 'marked' | 'not-marked' | 'weekend' {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return 'weekend';
    if (!this.attendanceTaken) return 'not-marked';
    return 'marked';
  }
}
