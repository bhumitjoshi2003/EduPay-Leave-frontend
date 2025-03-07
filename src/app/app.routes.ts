import { provideRouter, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full'},
    { path: 'home', component: HomeComponent},
    // { path: 'private', component: SomePrivateComponent, canActivate: [AuthGuard] },
    { path: '**', redirectTo: '/home', pathMatch: 'full' },
];

export const AppRoutingModule = {
    provideRouter: () => provideRouter(routes)
};