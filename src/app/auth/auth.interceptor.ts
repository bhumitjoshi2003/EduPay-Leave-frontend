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
import { AuthStateService } from './auth-state.service';

import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private authService: AuthService,
    private authStateService: AuthStateService
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const isAuthUrl =
      request.url.includes('/auth/login') ||
      request.url.includes('/auth/refresh-token') ||
      request.url.includes('/auth/request-password-reset') ||
      request.url.includes('/auth/reset-password');

    const reqWithCredentials = request.clone({ withCredentials: true });

    return next.handle(reqWithCredentials).pipe(
      catchError((error: HttpErrorResponse) => {

        if (error.status === 401 && !isAuthUrl) {
          return this.authService.refreshToken().pipe(
            tap((userInfo: any) => {
              this.authStateService.setUser(userInfo);
            }),
            switchMap(() => next.handle(reqWithCredentials)),
            catchError((refreshError: HttpErrorResponse) => {
              this.authStateService.clearUser();
              this.router.navigate(['/home']);
              return throwError(() => refreshError);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }
}
