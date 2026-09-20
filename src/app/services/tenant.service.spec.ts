import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TenantService } from './tenant.service';
import { environment } from '../../environments/environment';
import { STARTUP_HTTP_TIMEOUT_MS } from '../core/startup.constants';

/**
 * TenantService.loadSchoolBySlug() independently drives half of the APP_INITIALIZER's
 * Promise.all() in app.config.ts — without its own bounded timeout, a hung tenant lookup could
 * block app bootstrap indefinitely on its own, regardless of how AuthStateService behaves. This
 * suite proves that gap is closed the same way, and that the pre-existing "no branding on any
 * failure" degrade-gracefully behavior is otherwise unchanged.
 */
describe('TenantService — startup timeout', () => {
  let service: TenantService;
  let http: HttpTestingController;
  const slugUrl = (slug: string) => `${environment.apiUrl}/public/school/${slug}`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(TenantService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('resolves normally when the lookup succeeds quickly', async () => {
    const p = service.loadSchoolBySlug('demo-school');
    http.expectOne(slugUrl('demo-school')).flush({
      name: 'Demo School', slug: 'demo-school', logoUrl: null, themeColor: null, city: null, boardType: null,
    });
    await p;

    expect(service.isBranded).toBeTrue();
    expect(service.school?.name).toBe('Demo School');
  });

  it('degrades to unbranded (not an error) on a genuine 404 — unknown slug', async () => {
    const p = service.loadSchoolBySlug('no-such-school');
    http.expectOne(slugUrl('no-such-school')).flush('not found', { status: 404, statusText: 'Not Found' });
    await p;

    expect(service.isBranded).toBeFalse();
  });

  it('degrades to unbranded on a 503 rather than leaving init() unresolved', async () => {
    const p = service.loadSchoolBySlug('demo-school');
    http.expectOne(slugUrl('demo-school')).flush('unavailable', { status: 503, statusText: 'Service Unavailable' });
    await p;

    expect(service.isBranded).toBeFalse();
  });

  it('a hung lookup times out and resolves to unbranded instead of blocking startup forever', fakeAsync(() => {
    let settled = false;
    service.loadSchoolBySlug('demo-school').then(() => { settled = true; });
    const req = http.expectOne(slugUrl('demo-school')); // deliberately never flushed

    tick(STARTUP_HTTP_TIMEOUT_MS - 1);
    expect(settled).toBeFalse();

    tick(1);
    expect(settled).toBeTrue();
    expect(service.isBranded).toBeFalse();
    expect(req.cancelled).toBeTrue();
  }));
});
