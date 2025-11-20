import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';

import { Router } from '@angular/router';
import { AuthService } from './auth.service';

import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const accessToken = localStorage.getItem('accessToken');

    const isAuthUrl =
      request.url.includes('/api/auth/login') ||
      request.url.includes('/api/auth/refresh-token') ||
      request.url.includes('/api/auth/request-password-reset') ||
      request.url.includes('/api/auth/reset-password');

    // ✅ Attach access token only for non-auth URLs
    if (!isAuthUrl && accessToken) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${accessToken}` }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {

        // ✅ Only try refresh when:
        //  - status is 401
        //  - and this is NOT one of the auth endpoints
        if (error.status === 401 && !isAuthUrl) {

          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            // No refresh token at all → full logout
            this.authService.logout();
            this.router.navigate(['/home']);
            return throwError(() => error);
          }

          // 🔁 Try refresh flow
          return this.authService.refreshToken().pipe(
            switchMap((tokens: any) => {
              // ✅ refresh-token succeeded
              console.log('Refresh success, new access token:', tokens.accessToken);

              localStorage.setItem('accessToken', tokens.accessToken);

              const retryReq = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokens.accessToken}`
                }
              });

              return next.handle(retryReq);
            }),
            catchError((refreshError: HttpErrorResponse) => {
              // ❌ refresh-token failed → logout
              console.error('Refresh token failed:', refreshError);

              this.authService.logout();
              this.router.navigate(['/home']);
              return throwError(() => refreshError);
            })
          );
        }

        // For non-401 or auth URLs → just pass error forward
        return throwError(() => error);
      })
    );
  }
}
