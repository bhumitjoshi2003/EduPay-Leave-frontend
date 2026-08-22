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

import { AuthStateService } from '../../auth/auth-state.service';
import { TeacherService } from '../../services/teacher.service';
import { StudentService } from '../../services/student.service';
import { AttendanceService } from '../../services/attendance.service';
import { LeaveService, LeaveApplication } from '../../services/leave.service';
import { LoggerService } from '../../services/logger.service';
import { ToastService } from '../../services/toast.service';
import { TeacherCheckinService } from '../../services/teacher-checkin.service';
import { TeacherAttendanceRecord, TeacherAttendanceSummary } from '../../interfaces/teacher-checkin';
import { TeacherLeaveService } from '../../services/teacher-leave.service';
import { TeacherLeave } from '../../interfaces/teacher-leave';

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
  personalAttendance: TeacherAttendanceSummary | null = null;
  todayTeacherRecord: TeacherAttendanceRecord | null = null;
  personalSummaryLoading = true;
  recentTeacherLeaves: TeacherLeave[] = [];
  teacherLeavesLoading = true;

  constructor(
    private authState: AuthStateService,
    private teacherService: TeacherService,
    private studentService: StudentService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private checkinService: TeacherCheckinService,
    private teacherLeaveService: TeacherLeaveService
  ) {}

  ngOnInit(): void {
    const user = this.authState.getUser();
    if (!user) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.loadPersonalAttendance();
    this.loadRecentTeacherLeaves();

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
          this.toast.error('Error', 'Failed to load teacher profile.');
        },
      });
  }

  private loadRecentTeacherLeaves(): void {
    this.teacherLeaveService.getMyLeaves(0, 3)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.recentTeacherLeaves = response.content.slice(0, 3);
          this.teacherLeavesLoading = false;
          this.cdr.markForCheck();
        },
        error: error => {
          this.logger.error('Recent teacher leaves load error:', error);
          this.teacherLeavesLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadPersonalAttendance(): void {
    const month = this.today.getMonth() + 1;
    const year = this.today.getFullYear();

    this.checkinService.getMyAttendance(month, year)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summary => {
          this.personalAttendance = summary;
          const todayKey = this.toLocalDateKey(this.today);
          this.todayTeacherRecord = summary.records.find(record => record.date === todayKey) ?? null;
          this.personalSummaryLoading = false;
          this.cdr.markForCheck();
        },
        error: error => {
          this.logger.error('Personal attendance summary load error:', error);
          this.personalSummaryLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private toLocalDateKey(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
          // `X` is an internal sentinel proving attendance was submitted even when every
          // student is present. It must never appear to the teacher or count as an absence.
          this.attendanceTaken = absentToday.some(a => a.studentId === 'X');
          this.todayAbsent = absentToday.filter(a => a.studentId !== 'X'
            && (!a.status || a.status === 'ABSENT')).length;

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
          this.toast.error('Error', 'Failed to load class data.');
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
          this.toast.success('Approved', 'Leave has been approved.');
        },
        error: (err) => {
          this.logger.error('Approve failed', err);
          this.toast.error('Error', 'Failed to approve leave.');
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
          this.toast.info('Rejected', 'Leave has been rejected.');
        },
        error: (err) => {
          this.logger.error('Reject failed', err);
          this.toast.error('Error', 'Failed to reject leave.');
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

  get personalAttendanceStatus(): string {
    if (!this.todayTeacherRecord) return 'Not checked in';
    return this.todayTeacherRecord.status.replaceAll('_', ' ').toLowerCase()
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  get personalAttendancePercent(): number {
    return Math.max(0, Math.min(100, this.personalAttendance?.attendancePercentage ?? 0));
  }

  formatAttendanceTime(value: string | null): string {
    if (!value) return '—';
    const time = value.includes('T') ? value.split('T')[1] : value;
    const [hour = '', minute = ''] = time.split(':');
    if (!hour || !minute) return value;
    return `${Number(hour)}:${minute}`;
  }

  get absentCardState(): 'marked' | 'not-marked' | 'weekend' {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return 'weekend';
    if (!this.attendanceTaken) return 'not-marked';
    return 'marked';
  }

  hasFeature(featureKey: string): boolean {
    return this.authState.hasFeature(featureKey);
  }
}
