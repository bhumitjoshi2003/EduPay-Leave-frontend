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
import { StudentService } from '../../services/student.service';
import { AttendanceService } from '../../services/attendance.service';
import { LeaveService, LeaveApplication } from '../../services/leave.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  studentId = '';
  studentName = '';
  className = '';
  isLoading = true;
  today = new Date();

  attendancePercentage = 0;
  daysPresent = 0;
  daysAbsent = 0;
  totalWorkingDays = 0;
  pendingLeavesCount = 0;
  recentLeaves: LeaveApplication[] = [];

  constructor(
    private authState: AuthStateService,
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
    this.studentId = user.userId;

    this.studentService
      .getStudent(this.studentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (student) => {
          this.studentName = student.name;
          this.className = student.className;
          this.cdr.markForCheck();
          this.loadDashboardData();
        },
        error: (err) => {
          this.logger.error('Failed to load student', err);
          this.isLoading = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to load student profile.', 'error');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    forkJoin({
      summary: this.attendanceService.getStudentSummary(this.studentId, {
        type: 'month',
        month,
        year,
      }),
      leaves: this.leaveService.getLeavesByStudentId(this.studentId, 0, 10),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ summary, leaves }) => {
          this.attendancePercentage = summary.attendancePercentage;
          this.daysPresent = summary.daysPresent;
          this.daysAbsent = summary.daysAbsent;
          this.totalWorkingDays = summary.totalWorkingDays;

          const sorted = [...leaves.content].sort(
            (a, b) =>
              new Date(b.leaveDate).getTime() - new Date(a.leaveDate).getTime()
          );
          this.recentLeaves = sorted.slice(0, 5);
          this.pendingLeavesCount = leaves.content.filter(
            (l) => l.status === 'PENDING'
          ).length;

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load dashboard data', err);
          this.isLoading = false;
          this.cdr.markForCheck();
          Swal.fire('Error', 'Failed to load dashboard data.', 'error');
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
    if (this.attendancePercentage >= 85) return '#059669';
    if (this.attendancePercentage >= 70) return '#d97706';
    return '#dc2626';
  }

  getLeaveStatusClass(status: string): string {
    if (status === 'APPROVED') return 'sd-status--approved';
    if (status === 'REJECTED') return 'sd-status--rejected';
    return 'sd-status--pending';
  }

  getLeaveStatusLabel(status: string): string {
    if (status === 'APPROVED') return 'Approved';
    if (status === 'REJECTED') return 'Rejected';
    return 'Pending';
  }
}
