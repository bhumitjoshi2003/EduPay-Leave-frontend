import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private snackBar: MatSnackBar) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          if (error.error && error.error.message === 'Token Expired') {
            localStorage.removeItem('token');
            this.router.navigate(['/home']);
            this.snackBar.open('Session expired. Please login again.', 'Close', {
              duration: 5000,
            });
          } else {
            localStorage.removeItem('token');
            this.router.navigate(['/home']);
            this.snackBar.open('Unauthorized access. Please login again.', 'Close', {
              duration: 5000,
            });
          }
        }
        return throwError(error);
      })
    );
  }
}
