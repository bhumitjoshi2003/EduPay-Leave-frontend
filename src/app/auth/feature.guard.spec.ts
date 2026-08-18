import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthStateService } from './auth-state.service';
import { featureGuard } from './feature.guard';

describe('featureGuard', () => {
  let authState: jasmine.SpyObj<AuthStateService>;
  let router: jasmine.SpyObj<Router>;
  const adminHome = {} as UrlTree;

  beforeEach(() => {
    authState = jasmine.createSpyObj('AuthStateService', ['hasFeature', 'getUserRole']);
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(adminHome);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStateService, useValue: authState },
        { provide: Router, useValue: router },
      ],
    });
  });

  function runGuard(): boolean | UrlTree {
    const route = { data: { featureKey: 'BULK_IMPORT' } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      featureGuard(route, { url: '/dashboard/teacher-bulk-import' } as RouterStateSnapshot)
    ) as boolean | UrlTree;
  }

  it('allows an enabled feature', () => {
    authState.hasFeature.and.returnValue(true);
    expect(runGuard()).toBeTrue();
  });

  it('returns the admin dashboard URL tree when access is denied', () => {
    authState.hasFeature.and.returnValue(false);
    authState.getUserRole.and.returnValue('ADMIN');

    expect(runGuard()).toBe(adminHome);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard/admin-dashboard']);
  });
});
