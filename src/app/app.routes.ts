import { provideRouter, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PaymentTrackerComponent } from './components/fees/fees.component';
import { FeeStructureComponent } from './components/fee-structure/fee-structure.component';
import { PaymentComponent } from './components/payment/payment.component';
import { BusFeesComponent } from './components/bus-fees/bus-fees.component';
import { PaymentHistoryComponent } from './components/payment-history/payment-history.component';
import { PaymentDetailsComponent } from './components/payment-details/payment-details.component';
import { ApplyLeaveComponent } from './components/apply-leave/apply-leave.component';
import { AuthGuard } from './auth/auth.guard';
import { TeacherAttendanceComponent } from './components/teacher-attendance/teacher-attendance.component';
import { StudentAttendanceComponent } from './components/student-attendance/student-attendance.component';
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
import { NotificationComponent } from './components/notification/notification.component';
import { ViewNotificationComponent } from './components/view-notification/view-notification.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard],
        children: [
            { path: 'fees', component: PaymentTrackerComponent },
            { path: 'fee-structure', component: FeeStructureComponent },
            { path: 'payment', component: PaymentComponent },
            { path: 'bus-fees', component: BusFeesComponent },
            { path: 'payment-history', component: PaymentHistoryComponent },
            { path: 'payment-history-details/:paymentId', component: PaymentDetailsComponent },
            { path: 'apply-leave', component: ApplyLeaveComponent },
            { path: 'teacher-attendance', component: TeacherAttendanceComponent },
            { path: 'student-attendance', component: StudentAttendanceComponent },
            { path: 'student-attendance/:studentId', component: StudentAttendanceComponent },
            { path: 'student-list', component: StudentListComponent },
            { path: 'student-details/:studentId', component: StudentDetailsComponent },
            { path: 'view-leaves', component: ViewLeavesComponent },
            { path: 'payment-history/:studentId', component: PaymentHistoryComponent },
            { path: 'view-leaves/:studentId', component: ViewLeavesComponent },
            { path: 'fees/:studentId', component: PaymentTrackerComponent },
            { path: 'payment-history-admin', component: PaymentHistoryAdminComponent },
            { path: 'teacher-list', component: TeacherListComponent },
            { path: 'teacher-details/:teacherId', component: TeacherDetailsComponent },
            { path: 'notice', component: NoticeComponent },
            { path: 'register', component: RegisterComponent },
            { path: 'event-calendar', component: EventCalendarComponent },
            { path: 'event-new', component: EventFormComponent },
            { path: 'event-edit/:id', component: EventFormComponent },
            { path: 'notification-form', component: NotificationComponent },
            { path: 'view-notification', component: ViewNotificationComponent }
        ],
    },
    { path: '**', redirectTo: '/home', pathMatch: 'full' },
];

export const AppRoutingModule = {
    provideRouter: () => provideRouter(routes),
};