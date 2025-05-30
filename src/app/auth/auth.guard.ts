import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    if (localStorage.getItem('token')) {
      return true; // User is authenticated
    } else {
      localStorage.setItem('redirectUrl', state.url); // Store attempted URL
      this.router.navigate(['/home']); // Redirect to login if not authenticated
      return false;
    }
  }
}