import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { LoggerService } from '../../services/logger.service';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../auth/auth.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { TeacherService } from '../../services/teacher.service';
import { AdminService } from '../../services/admin.service';
import { NotificationService } from '../../services/notification.service';
import { SchoolService } from '../../services/school.service';
import { TenantService } from '../../services/tenant.service';
import { Subject, takeUntil, interval, Subscription } from 'rxjs';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AiCopilotComponent } from '../ai-copilot/ai-copilot.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    CommonModule,
    MatBadgeModule,
    AiCopilotComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {

  Role: string = '';
  Id: string = '';
  Name: string = '';
  Class: string = '';
  ClassTeacher: string = '';
  unreadNotificationCount: number = 0;
  sidebarCollapsed: boolean = false;
  mobileSidebarOpen: boolean = false;
  showUpdateBanner = false;
  latestAppVersion = '';
  private ngUnsubscribe = new Subject<void>();
  private pollingIntervalSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private authStateService: AuthStateService,
    private studentService: StudentService,
    private teacherService: TeacherService,
    private adminService: AdminService,
    private notificationService: NotificationService,
    private schoolService: SchoolService,
    public tenantService: TenantService,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) { }

  ngOnInit() {
    this.getDetails();
    this.handleInitialNavigation();
    this.fetchUnreadCount();
    // Re-fetch on every navigation (catches mark-all-read from notice board)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(() => this.fetchUnreadCount());
    // Also poll every 60 seconds as a background fallback
    this.pollingIntervalSubscription = interval(60000)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => this.fetchUnreadCount());
    this.checkForAppUpdate();
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    if (this.pollingIntervalSubscription) {
      this.pollingIntervalSubscription.unsubscribe();
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.authStateService.loadCurrentUser()
        .then(() => this.cdr.markForCheck())
        .catch(() => {});
    }
  }

  getDetails() {
    const user = this.authStateService.getUser();
    if (user) {
      this.Role = user.role;
      this.Id = user.userId;
      this.fetchUserDetails();
    }
  }

  fetchUserDetails() {
    if (this.Role === 'STUDENT' && this.Id) {
      this.studentService.getStudent(this.Id).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (student) => {
          this.Name = student.name;
          this.Class = student.className;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error('Error fetching student details:', error);
        }
      });
    } else if (this.Role === 'TEACHER' && this.Id) {
      this.teacherService.getTeacher(this.Id).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (teacher) => {
          this.Name = teacher.name;
          this.ClassTeacher = teacher.classTeacher ?? '';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error('Error fetching teacher details:', error);
        }
      });
    } else if (this.Role === 'ADMIN' && this.Id) {
      this.adminService.getAdminById(this.Id).pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (admin) => {
          this.Name = admin.name;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error('Error fetching admin details:', error);
        }
      });
    }
  }

  handleInitialNavigation(): void {
    if (this.Role === 'ADMIN' && this.subscriptionStatus === 'EXPIRED') {
      this.router.navigate(['/dashboard/school-settings'], { queryParams: { tab: 'subscription' } });
      return;
    }
    const url = this.router.url.split('?')[0];
    const isBareDashboard = url === '/dashboard' || url === '/dashboard/';
    if (!isBareDashboard) return;
    if (this.Role === 'STUDENT') {
      this.router.navigate(['/dashboard/student-dashboard']);
    } else if (this.Role === 'TEACHER') {
      this.router.navigate(['/dashboard/teacher-dashboard']);
    } else if (this.Role === 'ADMIN' || this.Role === 'SUB_ADMIN') {
      this.router.navigate(['/dashboard/admin-dashboard']);
    } else if (this.Role === 'SUPER_ADMIN') {
      this.router.navigate(['/dashboard/super-admin-dashboard']);
    }
  }

  isStudent(): boolean {
    return this.Role === 'STUDENT';
  }

  isTeacher(): boolean {
    return this.Role === 'TEACHER';
  }

  isAdmin(): boolean {
    return this.Role === 'ADMIN' || this.Role === 'SUB_ADMIN';
  }

  isSuperAdmin(): boolean {
    return this.Role === 'SUPER_ADMIN';
  }

  get subscriptionStatus(): string | null {
    return this.authStateService.getSubscriptionStatus();
  }

  /**
   * Returns true if the school's active plan includes the given feature key.
   * Paid features are denied unless the backend-provided entitlement explicitly
   * grants them. This matches AuthStateService and featureGuard.
   */
  hasFeature(key: string): boolean {
    return this.authStateService.hasFeature(key);
  }

  showSubscriptionWarning(): boolean {
    return this.authStateService.isSubscriptionWarning() && this.isAdmin();
  }

  private checkForAppUpdate(): void {
    const cap = (window as any).Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
    const mod = '@capawesome/capacitor-app-update';
    (Function('m', 'return import(m)')(mod) as Promise<any>).then(({ AppUpdate, AppUpdateAvailability }: any) => {
      AppUpdate.getAppUpdateInfo().then((info: any) => {
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
          this.latestAppVersion = info.availableVersionName ?? '';
          this.showUpdateBanner = true;
          this.cdr.markForCheck();
        }
      }).catch(() => {});
    }).catch(() => {});
  }

  openPlayStore(): void {
    const cap = (window as any).Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      const mod = '@capawesome/capacitor-app-update';
      (Function('m', 'return import(m)')(mod) as Promise<any>).then(({ AppUpdate }: any) => {
        AppUpdate.openAppStore().catch(() => {
          window.open('https://play.google.com/store/apps/details?id=in.edunexify.app', '_system');
        });
      }).catch(() => {
        window.open('https://play.google.com/store/apps/details?id=in.edunexify.app', '_system');
      });
    }
  }

  dismissUpdateBanner(): void {
    this.showUpdateBanner = false;
    this.cdr.markForCheck();
  }

  logout() {
    this.schoolService.invalidateClasses();
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => this.router.navigate(['/home'])
    });
  }

  fetchUnreadCount(): void {
    if (this.Role === 'SUPER_ADMIN') return;
    this.notificationService.getUnreadNotificationCount()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (count) => { this.unreadNotificationCount = count; this.cdr.markForCheck(); },
        error: (e) => this.logger.error('Error fetching unread count:', e),
      });
  }

  navigateToNoticeBoard(): void {
    this.router.navigate(['/dashboard/notice']);
  }

  getProfileInitials(): string {
    const source = (this.Name || this.Role || 'U').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.charAt(0).toUpperCase();
  }

  getRoleLabel(): string {
    const labels: Record<string, string> = {
      STUDENT: 'Student',
      TEACHER: 'Teacher',
      ADMIN: 'Admin',
      SUB_ADMIN: 'Sub Admin',
      SUPER_ADMIN: 'Super Admin',
    };
    return labels[this.Role] ?? this.Role;
  }

  getRoleChipClass(): string {
    const classes: Record<string, string> = {
      STUDENT: 'chip-student',
      TEACHER: 'chip-teacher',
      ADMIN: 'chip-admin',
      SUB_ADMIN: 'chip-subadmin',
      SUPER_ADMIN: 'chip-superadmin',
    };
    return classes[this.Role] ?? 'chip-student';
  }

  private get isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 900;
  }

  get menuIcon(): string {
    if (this.isMobile) return this.mobileSidebarOpen ? 'menu_open' : 'menu';
    return this.sidebarCollapsed ? 'menu' : 'menu_open';
  }

  toggleSidebar(): void {
    if (this.isMobile) {
      this.mobileSidebarOpen = !this.mobileSidebarOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
    this.cdr.markForCheck();
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
    this.cdr.markForCheck();
  }

  closeSidebarOnMobile(): void {
    if (this.isMobile) {
      this.mobileSidebarOpen = false;
      this.cdr.markForCheck();
    }
  }

  navigateToMyProfile(): void {
    if (this.isStudent() && this.Id) {
      this.router.navigate(['/dashboard/student-details', this.Id]);
    }
    if (this.isTeacher() && this.Id) {
      this.router.navigate(['/dashboard/teacher-details', this.Id]);
    }
    if (this.isAdmin() && this.Id) {
      this.router.navigate(['/dashboard/admin-details', this.Id]);
    }
  }
}
