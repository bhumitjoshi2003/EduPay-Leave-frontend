import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { StaffAdoptionService } from '../../services/staff-adoption.service';
import { LoggerService } from '../../services/logger.service';
import { ToastService } from '../../services/toast.service';
import { StaffAdoptionResponse, StaffAdoptionTeacherRow } from '../../interfaces/staff-adoption';
import { StaffAdoptionReminderType } from '../../interfaces/staff-adoption-reminder';

type AccountFilter = 'ALL' | 'STARTED' | 'NOT_STARTED';
type AttendanceFilter = 'ALL' | 'USED' | 'NOT_USED';
type ActivityFilter = 'ALL' | 'LAST_7_DAYS' | 'OLDER' | 'NEVER';

interface ReminderOption {
  type: StaffAdoptionReminderType;
  label: string;
  description: string;
}

const REMINDER_OPTIONS: ReminderOption[] = [
  { type: 'NOT_STARTED', label: 'Not started', description: 'Nudge teachers who have not yet signed in.' },
  { type: 'OUTDATED_APP', label: 'Outdated app', description: 'Ask teachers to update the Edunexify Android app.' },
  { type: 'ONBOARDING_INCOMPLETE', label: 'Onboarding incomplete', description: 'Remind teachers to finish Getting Started.' },
];

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

  readonly reminderOptions = REMINDER_OPTIONS;
  reminderPanelOpen = false;
  selectedReminderType: StaffAdoptionReminderType = 'NOT_STARTED';
  reminderPreviewLoading = false;
  reminderSendLoading = false;
  reminderError: string | null = null;

  constructor(
    private staffAdoptionService: StaffAdoptionService,
    private logger: LoggerService,
    private toast: ToastService,
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

  // ── Reminders (admin-triggered, never automatic) ────────────────

  toggleReminderPanel(): void {
    this.reminderPanelOpen = !this.reminderPanelOpen;
    this.reminderError = null;
    this.cdr.markForCheck();
  }

  /** Preview → confirm → send. The backend re-resolves recipients itself from `type` alone;
   *  this only ever asks it to preview, then to send — it never submits a recipient list. */
  previewAndSendReminder(): void {
    if (this.reminderPreviewLoading || this.reminderSendLoading) return;
    const type = this.selectedReminderType;
    this.reminderPreviewLoading = true;
    this.reminderError = null;
    this.cdr.markForCheck();

    this.staffAdoptionService.previewReminder(type).pipe(takeUntil(this.destroy$)).subscribe({
      next: preview => {
        this.reminderPreviewLoading = false;
        this.cdr.markForCheck();
        if (preview.count === 0) {
          this.toast.info('No recipients', 'No teachers currently match this reminder.');
          return;
        }
        this.confirmAndSend(type, preview.count, preview.teachers.map(t => t.name));
      },
      error: e => {
        this.logger.error('Reminder preview failed:', e);
        this.reminderPreviewLoading = false;
        this.reminderError = 'Could not load recipients. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  private confirmAndSend(type: StaffAdoptionReminderType, count: number, names: string[]): void {
    const shown = names.slice(0, 8);
    const more = names.length > shown.length ? `<p>&hellip; and ${names.length - shown.length} more</p>` : '';
    this.toast.confirm({
      title: `Send reminder to ${count} teacher${count > 1 ? 's' : ''}?`,
      html: `<p>${shown.join(', ')}</p>${more}`,
      icon: 'question',
      confirmText: 'Send reminder',
      cancelText: 'Cancel',
    }).then(confirmed => {
      if (!confirmed) return;
      this.sendReminder(type);
    });
  }

  private sendReminder(type: StaffAdoptionReminderType): void {
    this.reminderSendLoading = true;
    this.cdr.markForCheck();

    this.staffAdoptionService.sendReminder(type).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.reminderSendLoading = false;
        this.reminderPanelOpen = false;
        this.cdr.markForCheck();
        this.toastForSendResult(result.sentCount, result.skippedRecentCount);
      },
      error: e => {
        this.logger.error('Reminder send failed:', e);
        this.reminderSendLoading = false;
        this.reminderError = 'Could not send the reminder. Please try again.';
        this.cdr.markForCheck();
        this.toast.error('Error', 'Failed to send reminder. Please try again.');
      }
    });
  }

  /** Truthful wording: "sent" here means accepted for delivery, never a claim that email/push
   *  was actually received. */
  private toastForSendResult(sentCount: number, skippedRecentCount: number): void {
    if (sentCount === 0 && skippedRecentCount > 0) {
      this.toast.info('Already reminded', `All ${skippedRecentCount} teacher${skippedRecentCount > 1 ? 's were' : ' was'} reminded recently.`);
      return;
    }
    let message = `Reminder sent to ${sentCount} teacher${sentCount === 1 ? '' : 's'}.`;
    if (skippedRecentCount > 0) {
      message += ` ${skippedRecentCount} skipped because they were reminded recently.`;
    }
    this.toast.success('Reminder sent', message);
  }
}
