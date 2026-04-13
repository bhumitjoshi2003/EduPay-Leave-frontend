import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router, private authStateService: AuthStateService) { }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authStateService.isLoggedIn()) {
      return true;
    }
    localStorage.setItem('redirectUrl', state.url);
    this.router.navigate(['/home']);
    return false;
  }
}
