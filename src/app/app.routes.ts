import { provideRouter, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PaymentTrackerComponent } from './components/fees/fees.component';
import { FeeStructureComponent } from './components/fee-structure/fee-structure.component';
import { PaymentComponent } from './components/payment/payment.component';
import { BusFeesComponent } from './components/bus-fees/bus-fees.component';
import { PaymentHistoryComponent } from './components/payment-history/payment-history.component';
import { PaymentDetailsComponent } from './components/payment-details/payment-details.component';
import { ApplyLeaveComponent } from './components/apply-leave/apply-leave.component';
import { authGuard } from './auth/auth.guard';
import { TeacherAttendanceComponent } from './components/teacher-attendance/teacher-attendance.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StudentListComponent } from './components/student-list/student-list.component';
import { StudentDetailsComponent } from './components/student-details/student-details.component';
import { ViewLeavesComponent } from './components/view-leaves/view-leaves.component';
import { PaymentHistoryAdminComponent } from './components/payment-history-admin/payment-history-admin.component';
import { TeacherListComponent } from './components/teacher-list/teacher-list.component';
import { TeacherDetailsComponent } from './components/teacher-details/teacher-details.component';
import { RegisterComponent } from './components/register/register.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { NoticeComponent } from './components/notice/notice.component';
import { EventCalendarComponent } from './components/event-calendar/event-calendar.component';
import { EventFormComponent } from './components/event-form/event-form.component';
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';
import { AdminListComponent } from './components/admin-list/admin-list.component';
import { AdminDetailsComponent } from './components/admin-details/admin-details.component';
import { RegisterAdminComponent } from './components/register-admin/register-admin.component';
import { BulkImportComponent } from './components/bulk-import/bulk-import.component';
import { TeacherBulkImportComponent } from './components/teacher-bulk-import/teacher-bulk-import.component';
import { roleGuard } from './auth/role.guard';
import { SubjectConfigComponent } from './components/subject-config/subject-config.component';
import { ExamConfigComponent } from './components/exam-config/exam-config.component';
import { StudentStreamComponent } from './components/student-stream/student-stream.component';
import { MarkEntryComponent } from './components/mark-entry/mark-entry.component';
import { StudentResultsComponent } from './components/student-results/student-results.component';
import { ClassResultsComponent } from './components/class-results/class-results.component';
import { ReportCardComponent } from './components/report-card/report-card.component';
import { AttendanceSummaryComponent } from './components/attendance-summary/attendance-summary.component';
import { TimetableComponent } from './components/timetable/timetable.component';
import { FeeRemindersComponent } from './components/fee-reminders/fee-reminders.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { ClassManagementComponent } from './components/class-management/class-management.component';
import { SchoolSettingsComponent } from './components/school-settings/school-settings.component';
import { StudentPromotionComponent } from './components/student-promotion/student-promotion.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './components/teacher-dashboard/teacher-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { SuperAdminDashboardComponent } from './components/super-admin-dashboard/super-admin-dashboard.component';
import { StudentSearchComponent } from './components/student-search/student-search.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      // ── Student routes ────────────────────────────────────────────────
      {
        path: 'fees', component: PaymentTrackerComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'ADMIN'] }
      },
      {
        path: 'fees/:studentId', component: PaymentTrackerComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'payment-history', component: PaymentHistoryComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'ADMIN'] }
      },
      {
        path: 'payment-history/:studentId', component: PaymentHistoryComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'payment-history-details/:paymentId', component: PaymentDetailsComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'ADMIN'] }
      },
      {
        path: 'apply-leave', component: ApplyLeaveComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT'] }
      },
      {
        path: 'attendance-summary', component: AttendanceSummaryComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'TEACHER', 'ADMIN', 'SUB_ADMIN'] }
      },

      // ── Teacher routes ────────────────────────────────────────────────
      {
        path: 'teacher-attendance', component: TeacherAttendanceComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },

      // ── Shared list / detail routes (Teacher + Admin) ─────────────────
      {
        path: 'student-list', component: StudentListComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },
      {
        path: 'student-details/:studentId', component: StudentDetailsComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN', 'STUDENT'] }
      },
      {
        path: 'view-leaves', component: ViewLeavesComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },
      {
        path: 'view-leaves/:studentId', component: ViewLeavesComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },
      {
        path: 'event-new', component: EventFormComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },
      {
        path: 'event-edit/:id', component: EventFormComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },

      // ── Admin-only routes ─────────────────────────────────────────────
      {
        path: 'payment-history-admin', component: PaymentHistoryAdminComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'fee-reminders', component: FeeRemindersComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'teacher-list', component: TeacherListComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'teacher-details/:teacherId', component: TeacherDetailsComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN', 'TEACHER'] }
      },
      {
        path: 'register', component: RegisterComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'student-bulk-import', component: BulkImportComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'teacher-bulk-import', component: TeacherBulkImportComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },

      // ── Admin + Super Admin routes ─────────────────────────────────────
      {
        path: 'admin-list', component: AdminListComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN', 'SUPER_ADMIN'] }
      },
      {
        path: 'admin-details/:adminId', component: AdminDetailsComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN', 'SUPER_ADMIN'] }
      },
      {
        path: 'register-admin', component: RegisterAdminComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN', 'SUPER_ADMIN'] }
      },
      {
        path: 'audit-logs', component: AuditLogsComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'student-search', component: StudentSearchComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'class-management', component: ClassManagementComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN', 'SUB_ADMIN'] }
      },
      {
        path: 'school-settings', component: SchoolSettingsComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'student-promotion', component: StudentPromotionComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'fee-structure', component: FeeStructureComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'ADMIN'] }
      },
      {
        path: 'bus-fees', component: BusFeesComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },

      // ── Exam / Results ────────────────────────────────────────────────
      {
        path: 'subject-config', component: SubjectConfigComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'exam-config', component: ExamConfigComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'student-stream', component: StudentStreamComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'mark-entry', component: MarkEntryComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },
      {
        path: 'my-results', component: StudentResultsComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT'] }
      },
      {
        path: 'class-results', component: ClassResultsComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER', 'ADMIN'] }
      },
      {
        path: 'report-card', component: ReportCardComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'TEACHER', 'ADMIN'] }
      },

      // ── Dashboards ────────────────────────────────────────────────────
      {
        path: 'student-dashboard', component: StudentDashboardComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT'] }
      },
      {
        path: 'teacher-dashboard', component: TeacherDashboardComponent,
        canActivate: [roleGuard], data: { roles: ['TEACHER'] }
      },
      {
        path: 'admin-dashboard', component: AdminDashboardComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },
      {
        path: 'super-admin-dashboard', component: SuperAdminDashboardComponent,
        canActivate: [roleGuard], data: { roles: ['SUPER_ADMIN'] }
      },

      // ── Analytics Dashboard ───────────────────────────────────────────
      {
        path: 'analytics', component: AnalyticsComponent,
        canActivate: [roleGuard], data: { roles: ['ADMIN'] }
      },

      // ── Timetable ─────────────────────────────────────────────────────
      {
        path: 'timetable', component: TimetableComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'TEACHER', 'ADMIN', 'SUB_ADMIN'] }
      },

      // ── Open to all authenticated users ──────────────────────────────
      {
        path: 'notice', component: NoticeComponent,
        canActivate: [roleGuard], data: { roles: ['STUDENT', 'TEACHER', 'ADMIN'] }
      },
      { path: 'event-calendar', component: EventCalendarComponent },
      { path: 'payment', component: PaymentComponent },
    ],
  },
  { path: '**', redirectTo: '/home', pathMatch: 'full' },
];

export const AppRoutingModule = {
  provideRouter: () => provideRouter(routes),
};