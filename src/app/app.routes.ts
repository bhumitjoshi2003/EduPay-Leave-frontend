import { provideRouter, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { StudentComponent } from './components/student/student.component';
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

// import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full'},
    { path: 'home', component: HomeComponent },
    { path: 'fee-structure', component: FeeStructureComponent, canActivate: [AuthGuard] },
    { path: 'fees', component: PaymentTrackerComponent, canActivate: [AuthGuard] },
    { path: 'payment', component: PaymentComponent, canActivate: [AuthGuard] },
    { path: 'bus-fees', component: BusFeesComponent, canActivate: [AuthGuard] },
    { path: 'payment-history', component: PaymentHistoryComponent, canActivate: [AuthGuard] },
    { path: 'payment-history-details/:paymentId', component: PaymentDetailsComponent, canActivate: [AuthGuard] },
    { path: 'apply-leave', component: ApplyLeaveComponent, canActivate: [AuthGuard] },
    { path: 'teacher-attendance', component: TeacherAttendanceComponent, canActivate: [AuthGuard] },
    { path: 'student-attendance', component: StudentAttendanceComponent, canActivate: [AuthGuard] },
    { path: '**', redirectTo: '/home', pathMatch: 'full' },
];

export const AppRoutingModule = {
    provideRouter: () => provideRouter(routes)
};