// import { Injectable } from '@angular/core';
// import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
// import { KeycloakService } from '../services/keycloak.service';

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthGuard implements CanActivate {
//   constructor(private keycloak: KeycloakService, private router: Router) {}

//   canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
//     if (this.keycloak) {
//       this.router.navigate(['/student']);
//       return false;
//     } else {
//       this.router.navigate(['/home']);
//       return true;
//     }
//   }
// }
