import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthStateService } from '../../auth/auth-state.service';
import { AdminService } from '../../services/admin.service';
import { DashboardAnalyticsService } from '../../services/dashboard-analytics.service';
import { LeaveService } from '../../services/leave.service';
import { SchoolService } from '../../services/school.service';
import { TeacherCheckinService } from '../../services/teacher-checkin.service';
import { StaffAdoptionService } from '../../services/staff-adoption.service';
import { LoggerService } from '../../services/logger.service';
import { ToastService } from '../../services/toast.service';
import { StaffAdoptionResponse } from '../../interfaces/staff-adoption';

describe('AdminDashboardComponent — Staff Adoption card', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let staffAdoptionService: jasmine.SpyObj<StaffAdoptionService>;
  let authState: jasmine.SpyObj<AuthStateService>;

  const staffAdoption: StaffAdoptionResponse = {
    summary: { totalTeachers: 22, startedTeachers: 18, notStartedTeachers: 3, attendanceUsedTeachers: 16, disabledTeachers: 1 },
    teachers: [],
  };

  function configure(role: string): void {
    authState = jasmine.createSpyObj('AuthStateService', ['getUser', 'hasFeature']);
    authState.getUser.and.returnValue({ userId: 'U1', role, name: 'Test', className: '' } as any);
    authState.hasFeature.and.returnValue(false);
    staffAdoptionService = jasmine.createSpyObj('StaffAdoptionService', ['getStaffAdoption']);
    staffAdoptionService.getStaffAdoption.and.returnValue(of(staffAdoption));

    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStateService, useValue: authState },
        { provide: AdminService, useValue: { getAdminById: () => of({ name: 'Test Admin' }) } },
        { provide: DashboardAnalyticsService, useValue: { getStats: () => of({ totalStudents: 0, totalTeachers: 0, feesCollectedThisMonth: 0, overdueStudents: 0, todayAttendanceRate: 0, pendingLeaves: 0 }) } },
        { provide: LeaveService, useValue: { getLeavesPaginated: () => of({ content: [] }) } },
        { provide: SchoolService, useValue: { getEntitlement: () => of(null), getSetupHealth: () => of(null) } },
        { provide: TeacherCheckinService, useValue: { getTodaySummary: () => of(null) } },
        { provide: StaffAdoptionService, useValue: staffAdoptionService },
        { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['error']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    fixture = TestBed.createComponent(AdminDashboardComponent);
  }

  it('renders the Staff Adoption card with summary values for an ADMIN', () => {
    configure('ADMIN');
    fixture.detectChanges();

    expect(staffAdoptionService.getStaffAdoption).toHaveBeenCalled();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Staff Adoption');
    expect(text).toContain('82% started');
    expect(text).toContain('16 have used attendance');
  });

  it('does not call staff adoption or render the card for a non-ADMIN role', () => {
    configure('SUB_ADMIN');
    fixture.detectChanges();

    expect(staffAdoptionService.getStaffAdoption).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Staff Adoption');
  });

  it('the View Staff Adoption CTA links to the dedicated page', () => {
    configure('ADMIN');
    fixture.detectChanges();
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a[routerLink="/dashboard/staff-adoption"]');
    expect(link).not.toBeNull();
  });
});
