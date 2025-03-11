import { provideRouter, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { StudentComponent } from './components/student/student.component';
import { PaymentTrackerComponent } from './components/fees/fees.component';
import { FeeStructureComponent } from './components/fee-structure/fee-structure.component';
import { PaymentComponent } from './components/payment/payment.component';

// import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full'},
    { path: 'home', component: HomeComponent},
    { path: 'fee-structure', component: FeeStructureComponent },
    { path: 'fees', component: PaymentTrackerComponent },
    { path: 'payment', component: PaymentComponent },
    { path: '**', redirectTo: '/home', pathMatch: 'full' },
];

export const AppRoutingModule = {
    provideRouter: () => provideRouter(routes)
};