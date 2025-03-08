import { provideRouter, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { StudentComponent } from './components/student/student.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full'},
    { path: 'home', component: HomeComponent},
    { path: 'student', component: StudentComponent, canActivate:[AuthGuard] },
    { path: '**', redirectTo: '/home', pathMatch: 'full' },
];

export const AppRoutingModule = {
    provideRouter: () => provideRouter(routes)
};