import { ApplicationConfig, ErrorHandler, PLATFORM_ID, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AuthInterceptor } from './auth/auth.interceptor';
import { AuthStateService } from './auth/auth-state.service';
import { GlobalErrorHandler } from './core/global-error-handler';
import { TenantService } from './services/tenant.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideAppInitializer(() => {
      const tenantService   = inject(TenantService);
      const authStateService = inject(AuthStateService);
      const platformId      = inject(PLATFORM_ID);

      return Promise.all([
        tenantService.init(),
        authStateService.loadCurrentUser(),
      ]).then(() => {
        // Login is only supported from the root domain (edunexify.co.in).
        // If the user is on a school subdomain without a valid session, redirect
        // them to the root domain so they can log in there.
        if (isPlatformBrowser(platformId) && tenantService.slug && !authStateService.isLoggedIn()) {
          const rootUrl = window.location.origin.replace(`${tenantService.slug}.`, '');
          window.location.href = rootUrl;
        }
      });
    })
  ]
};
