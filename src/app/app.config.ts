import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
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
      const tenantService    = inject(TenantService);
      const authStateService = inject(AuthStateService);

      // Load school branding (from subdomain) and current user session in parallel.
      // Unauthenticated users on a school subdomain now see the branded login page —
      // no cross-domain redirect needed here.
      return Promise.all([
        tenantService.init(),
        authStateService.loadCurrentUser(),
      ]);
    })
  ]
};
