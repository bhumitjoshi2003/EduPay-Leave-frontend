import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { StaffAdoptionService } from '../../services/staff-adoption.service';
import { LoggerService } from '../../services/logger.service';
import { StaffAdoptionResponse, StaffAdoptionTeacherRow } from '../../interfaces/staff-adoption';

type AccountFilter = 'ALL' | 'STARTED' | 'NOT_STARTED';
type AttendanceFilter = 'ALL' | 'USED' | 'NOT_USED';
type ActivityFilter = 'ALL' | 'LAST_7_DAYS' | 'OLDER' | 'NEVER';

@Component({
  selector: 'app-staff-adoption',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  templateUrl: './staff-adoption.component.html',
  styleUrl: './staff-adoption.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffAdoptionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = true;
  error = false;
  data: StaffAdoptionResponse | null = null;

  searchTerm = '';
  accountFilter: AccountFilter = 'ALL';
  attendanceFilter: AttendanceFilter = 'ALL';
  activityFilter: ActivityFilter = 'ALL';

  constructor(
    private staffAdoptionService: StaffAdoptionService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.staffAdoptionService.getStaffAdoption().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.data = response;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: e => {
        this.logger.error('Staff adoption load error:', e);
        this.loading = false;
        this.error = true;
        this.cdr.markForCheck();
      }
    });
  }

  /** "Not started" for the top summary specifically folds in DISABLED accounts, so the three
   *  summary numbers always add up to the total a reader sees at a glance — the per-teacher
   *  table still shows the precise Disabled/Account pending distinction untouched. */
  get notStartedForSummary(): number {
    if (!this.data) return 0;
    return this.data.summary.notStartedTeachers + this.data.summary.disabledTeachers;
  }

  /** Headline figure for the hero — same "% of required essentials" idea as School Setup,
   *  applied to adoption instead: what share of teachers have actually started. */
  get adoptionRatePercent(): number {
    if (!this.data || this.data.summary.totalTeachers === 0) return 0;
    return Math.round((this.data.summary.startedTeachers / this.data.summary.totalTeachers) * 100);
  }

  get filteredTeachers(): StaffAdoptionTeacherRow[] {
    if (!this.data) return [];
    const term = this.searchTerm.trim().toLowerCase();
    return this.data.teachers.filter(teacher => {
      if (term && !teacher.name.toLowerCase().includes(term) && !teacher.teacherId.toLowerCase().includes(term)) {
        return false;
      }
      if (this.accountFilter === 'STARTED' && teacher.accountStatus !== 'STARTED') return false;
      if (this.accountFilter === 'NOT_STARTED' && teacher.accountStatus === 'STARTED') return false;
      if (this.attendanceFilter === 'USED' && !teacher.hasUsedAttendance) return false;
      if (this.attendanceFilter === 'NOT_USED' && teacher.hasUsedAttendance) return false;
      const activeAt = teacher.lastActiveAt ? new Date(teacher.lastActiveAt).getTime() : null;
      const sevenDaysAgo = Date.now() - 7 * 86_400_000;
      if (this.activityFilter === 'LAST_7_DAYS' && (!activeAt || activeAt < sevenDaysAgo)) return false;
      if (this.activityFilter === 'OLDER' && (!activeAt || activeAt >= sevenDaysAgo)) return false;
      if (this.activityFilter === 'NEVER' && activeAt) return false;
      return true;
    });
  }

  statusLabel(status: StaffAdoptionTeacherRow['accountStatus']): string {
    switch (status) {
      case 'STARTED': return 'Started';
      case 'DISABLED': return 'Disabled';
      case 'ACCOUNT_PENDING': return 'Account pending';
      default: return 'Not started';
    }
  }

  statusClass(status: StaffAdoptionTeacherRow['accountStatus']): string {
    return 'sa-chip-' + status.toLowerCase().replace(/_/g, '-');
  }

  onboardingLabel(teacher: StaffAdoptionTeacherRow): string {
    return teacher.onboardingStatus === 'COMPLETED' ? 'Completed' : 'Not reported';
  }

  appStatusLabel(teacher: StaffAdoptionTeacherRow): string {
    switch (teacher.appVersionStatus) {
      case 'UP_TO_DATE': return 'Up to date';
      case 'UPDATE_AVAILABLE': return 'Update available';
      case 'UPDATE_REQUIRED': return 'Update required';
      default: return 'No version reported';
    }
  }

  /** Today / Yesterday / "N days ago" (up to a week) / "MMM D, YYYY" — never a raw ISO string,
   *  never null/undefined text. Null input always renders as "Never". */
  formatDate(value: string | null): string {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Never';

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(new Date());
    const target = startOfDay(date);
    const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 6) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
