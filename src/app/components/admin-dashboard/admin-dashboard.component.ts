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
import { AdminService } from '../../services/admin.service';
import {
  DashboardAnalyticsService,
  DashboardStats,
} from '../../services/dashboard-analytics.service';
import { LeaveService, LeaveApplication } from '../../services/leave.service';
import { SchoolService, SchoolEntitlementSummary } from '../../services/school.service';
import { LoggerService } from '../../services/logger.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  adminName = '';
  isLoading = true;
  today = new Date();
  stats: DashboardStats | null = null;
  recentLeaves: LeaveApplication[] = [];
  entitlement: SchoolEntitlementSummary | null = null;

  constructor(
    private authState: AuthStateService,
    private adminService: AdminService,
    private analyticsService: DashboardAnalyticsService,
    private leaveService: LeaveService,
    private schoolService: SchoolService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const user = this.authState.getUser();
    if (!user) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.adminService
      .getAdminById(user.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (admin) => {
          this.adminName = admin.name;
          this.cdr.markForCheck();
        },
        error: (err) => this.logger.error('Failed to load admin profile', err),
      });

    forkJoin({
      stats: this.analyticsService.getStats(),
      leaves: this.leaveService.getLeavesPaginated(0, 10),
      entitlement: this.schoolService.getEntitlement(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ stats, leaves, entitlement }) => {
          this.stats = stats;
          this.recentLeaves = leaves.content.filter(
            (l) => l.status === 'PENDING'
          );
          this.entitlement = entitlement;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load dashboard stats', err);
          this.isLoading = false;
          this.cdr.markForCheck();
          this.toast.error('Error', 'Failed to load dashboard data.');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  approveLeave(leaveId: number): void {
    this.leaveService
      .updateLeaveStatus(leaveId, 'APPROVED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recentLeaves = this.recentLeaves.filter((l) => l.id !== leaveId);
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

  /** Bar fill width — capped at 100% for display only. */
  usagePct(current: number, max: number | null): number {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  }

  /** Raw uncapped percentage — used for threshold comparisons. */
  usagePctRaw(current: number, max: number | null): number {
    if (!max || max <= 0) return 0;
    return Math.round((current / max) * 100);
  }

  usageBarColor(rawPct: number, softPct: number | null, hardPct: number | null): string {
    const soft = softPct ?? 90;
    const hard = hardPct ?? 105;
    if (rawPct >= hard) return '#dc2626';
    if (rawPct >= soft) return '#d97706';
    return '#059669';
  }

  /** Days until a given ISO date string. Returns null if date is null/undefined. */
  daysUntil(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  }

  /** Short countdown label shown in the plan banner (only when <= 14 days or expired). */
  countdownLabel(): string {
    if (!this.entitlement) return '';
    const s = this.entitlement.subscriptionStatus;
    if (s === 'EXPIRED') return 'Subscription expired';
    if (s === 'GRACE') {
      const d = this.daysUntil(this.entitlement.graceEndsAt);
      if (d === null) return 'Grace period active';
      return d <= 0 ? 'Grace period ended' : d === 1 ? '1 day left in grace' : `${d} days left in grace`;
    }
    if (s === 'TRIAL') {
      const d = this.daysUntil(this.entitlement.trialEndsAt);
      if (d === null || d > 14) return '';
      return d <= 0 ? 'Trial expired' : d === 1 ? '1 day left' : `${d} days left`;
    }
    if (s === 'ACTIVE') {
      const d = this.daysUntil(this.entitlement.expiresAt);
      if (d === null || d > 14) return '';
      return d <= 0 ? 'Expired' : d === 1 ? '1 day left' : `${d} days left`;
    }
    return '';
  }

  /** True when the "Upgrade Now" CTA should be shown in the plan banner. */
  showUpgradeCta(): boolean {
    if (!this.entitlement) return false;
    const s = this.entitlement.subscriptionStatus;
    if (s === 'EXPIRED' || s === 'GRACE') return true;
    const d = s === 'TRIAL'
      ? this.daysUntil(this.entitlement.trialEndsAt)
      : this.daysUntil(this.entitlement.expiresAt);
    return d !== null && d <= 7;
  }

  /** CSS modifier for the countdown badge colour. */
  countdownUrgency(): 'critical' | 'warn' | 'info' {
    if (!this.entitlement) return 'info';
    const s = this.entitlement.subscriptionStatus;
    if (s === 'EXPIRED' || s === 'GRACE') return 'critical';
    const d = s === 'TRIAL'
      ? this.daysUntil(this.entitlement.trialEndsAt)
      : this.daysUntil(this.entitlement.expiresAt);
    if (d === null) return 'info';
    if (d <= 3) return 'critical';
    if (d <= 7) return 'warn';
    return 'info';
  }

  get attendanceColor(): string {
    const rate = this.stats?.todayAttendanceRate ?? 0;
    if (rate >= 85) return '#059669';
    if (rate >= 70) return '#d97706';
    return '#dc2626';
  }

  get attendanceGradient(): string {
    const rate = this.stats?.todayAttendanceRate ?? 0;
    if (rate >= 85) return 'linear-gradient(135deg, #059669, #34d399)';
    if (rate >= 70) return 'linear-gradient(135deg, #d97706, #fbbf24)';
    return 'linear-gradient(135deg, #dc2626, #f87171)';
  }
}
