// import { HttpInterceptorFn } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { KeycloakService } from '../services/keycloak.service';

// export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
//   const keycloakService = inject(KeycloakService);
//   const token = keycloakService.getToken(); // Get the token from Keycloak service

//   const clonedRequest = req.clone({
//     setHeaders: {
//       Authorization: token ? `Bearer ${token}` : ''
//     }
//   });

//   return next(clonedRequest);
// };
