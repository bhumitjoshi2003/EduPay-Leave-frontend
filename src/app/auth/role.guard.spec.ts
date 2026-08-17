import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { roleGuard } from './role.guard';
import { AuthStateService } from './auth-state.service';

describe('roleGuard', () => {
  let authState: jasmine.SpyObj<AuthStateService>;
  let router: Router;

  beforeEach(() => {
    authState = jasmine.createSpyObj('AuthStateService', ['isLoggedIn', 'mustChangePassword', 'getUserRole']);
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthStateService, useValue: authState }],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function run(roles: string[] = ['ADMIN']) {
    const route = { data: { roles }, routeConfig: { path: 'fees' } } as any;
    return TestBed.runInInjectionContext(() => roleGuard(route, { url: '/dashboard/fees' } as any));
  }

  it('redirects a logged-out user to /home', () => {
    authState.isLoggedIn.and.returnValue(false);

    expect(run()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('redirects a restricted (mustChangePassword) user to /change-initial-password before checking role', () => {
    authState.isLoggedIn.and.returnValue(true);
    authState.mustChangePassword.and.returnValue(true);

    expect(run(['ADMIN'])).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/change-initial-password']);
    expect(authState.getUserRole).not.toHaveBeenCalled();
  });

  it('allows a normal user whose role matches', () => {
    authState.isLoggedIn.and.returnValue(true);
    authState.mustChangePassword.and.returnValue(false);
    authState.getUserRole.and.returnValue('ADMIN');

    expect(run(['ADMIN'])).toBeTrue();
  });

  it('redirects to /dashboard when the role does not match', () => {
    authState.isLoggedIn.and.returnValue(true);
    authState.mustChangePassword.and.returnValue(false);
    authState.getUserRole.and.returnValue('STUDENT');

    expect(run(['ADMIN'])).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
