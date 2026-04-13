import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp > nowInSeconds) {
          return true;
        }
      } catch {
        // malformed token — fall through to redirect
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    localStorage.setItem('redirectUrl', state.url);
    this.router.navigate(['/home']);
    return false;
  }
}