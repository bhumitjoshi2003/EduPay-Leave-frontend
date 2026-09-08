import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthInterceptor } from './auth.interceptor';
import { environment } from '../../environments/environment';

/**
 * Phase: forgot-password /home hijack fix. A failed silent token-refresh must not force
 * navigation away from a route that's genuinely usable with zero session (home,
 * reset-password, verify-rc) — an anonymous visitor there is EXPECTED to get 401/401, and
 * that must not hijack them off the page they're legitimately trying to use. Protected
 * routes must keep the original behavior (redirect to /home) unchanged.
 */
describe('AuthInterceptor — refresh-failure navigation', () => {
  let http: HttpTestingController;
  let httpClient: HttpClient;
  let router: Router;
  const base = environment.apiUrl;

  const userInfo = {
    userId: 'u1', role: 'ADMIN', name: null, className: null, schoolSlug: null,
    featureKeys: null, planTier: null, planVersion: null, subscriptionStatus: null,
    trialEndsAt: null, expiresAt: null, graceEndsAt: null, permissionKeys: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  const originalPath = window.location.pathname + window.location.search;

  afterEach(() => {
    http.verify();
    window.history.replaceState(null, '', originalPath);
  });

  function simulatePath(path: string): void {
    window.history.pushState(null, '', path);
  }

  function failMeThenRefresh(originalUrl: string): void {
    httpClient.get(originalUrl, { withCredentials: true }).subscribe({ error: () => {} });
    http.expectOne(originalUrl).flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${base}/auth/refresh-token`).flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
  }

  it('does not navigate away when an anonymous /me 401 + refresh 401 happens on reset-password', () => {
    simulatePath('/reset-password');
    failMeThenRefresh(`${base}/auth/me`);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not navigate away when the same failure happens on verify-rc', () => {
    simulatePath('/verify-rc');
    failMeThenRefresh(`${base}/auth/me`);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not navigate away on home itself', () => {
    simulatePath('/home');
    failMeThenRefresh(`${base}/auth/me`);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('still redirects to /home when refresh fails on a protected route', () => {
    simulatePath('/dashboard/fees');
    failMeThenRefresh(`${base}/some-protected-endpoint`);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('still redirects to /home when refresh fails on a nested protected route', () => {
    simulatePath('/dashboard/fees/S1');
    failMeThenRefresh(`${base}/some-protected-endpoint`);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('retries the original request after a successful refresh and never navigates, on any route', () => {
    simulatePath('/dashboard/fees');
    httpClient.get(`${base}/some-protected-endpoint`, { withCredentials: true }).subscribe();

    http.expectOne(`${base}/some-protected-endpoint`)
        .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${base}/auth/refresh-token`).flush(userInfo);
    http.expectOne(`${base}/some-protected-endpoint`).flush({ ok: true });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not treat a route merely starting with a public prefix as public (e.g. /reset-password-request)', () => {
    simulatePath('/reset-password-request');
    failMeThenRefresh(`${base}/some-protected-endpoint`);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
