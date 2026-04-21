import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, OnDestroy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartData } from 'chart.js';
import {
  DashboardAnalyticsService, DashboardStats, FeeTrend, ClassStats
} from '../../services/dashboard-analytics.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { AdminService } from '../../services/admin.service';
import { LoggerService } from '../../services/logger.service';

Chart.register(...registerables);

const PALETTE = [
  '#6366f1', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#db2777', '#0284c7',
  '#65a30d', '#ea580c', '#0d9488', '#8b5cf6',
];

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  adminName = '';
  stats: DashboardStats | null = null;
  isLoading = true;
  error = '';
  today = new Date();

  // ── Fee trend (bar) ───────────────────────────────────────────
  feeTrendData: ChartData<'bar'> = { labels: [], datasets: [] };
  feeTrendOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: ctx => `₹${Number(ctx.parsed.y).toLocaleString('en-IN')}` }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { callback: val => `₹${Number(val).toLocaleString('en-IN')}` }
      },
      x: { grid: { display: false } }
    }
  };

  // ── Class attendance (horizontal bar) ────────────────────────
  attendanceData: ChartData<'bar'> = { labels: [], datasets: [] };
  attendanceOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${Number(ctx.parsed.x).toFixed(1)}%` } }
    },
    scales: {
      x: {
        beginAtZero: true, max: 100,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: { callback: val => `${val}%` }
      },
      y: { grid: { display: false } }
    }
  };

  // ── Student distribution (doughnut) ──────────────────────────
  distributionData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  distributionOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} students` } }
    },
    cutout: '62%',
  };

  constructor(
    private analyticsService: DashboardAnalyticsService,
    private authState: AuthStateService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService,
  ) {}

  ngOnInit(): void {
    const user = this.authState.getUser();
    if (user?.userId) {
      this.adminService.getAdminById(user.userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: a => { this.adminName = a.name; this.cdr.markForCheck(); } });
    }
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll(): void {
    this.isLoading = true;
    forkJoin([
      this.analyticsService.getStats(),
      this.analyticsService.getFeeTrend(),
      this.analyticsService.getClassStats(),
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([stats, feeTrend, classStats]) => {
        this.stats = stats;
        this.buildFeeTrend(feeTrend);
        this.buildAttendance(classStats);
        this.buildDistribution(classStats);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: e => {
        this.logger.error('Dashboard load error:', e);
        this.error = 'Failed to load dashboard data. Please refresh.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private buildFeeTrend(data: FeeTrend[]): void {
    this.feeTrendData = {
      labels: data.map(d => d.month),
      datasets: [{
        data: data.map(d => d.amount),
        backgroundColor: data.map((_, i) =>
          `rgba(99,102,241,${0.4 + (i / Math.max(data.length - 1, 1)) * 0.55})`),
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    };
  }

  private buildAttendance(data: ClassStats[]): void {
    this.attendanceData = {
      labels: data.map(d => `Cl. ${d.className}`),
      datasets: [{
        data: data.map(d => d.attendanceRate),
        backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length] + 'bb'),
        borderColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
  }

  private buildDistribution(data: ClassStats[]): void {
    this.distributionData = {
      labels: data.map(d => `Class ${d.className}`),
      datasets: [{
        data: data.map(d => d.studentCount),
        backgroundColor: PALETTE.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 10,
      }]
    };
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get attendanceColor(): string {
    const r = this.stats?.todayAttendanceRate ?? 0;
    if (r >= 85) return '#059669';
    if (r >= 70) return '#d97706';
    return '#dc2626';
  }
}
