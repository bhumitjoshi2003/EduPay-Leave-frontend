import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { AuthStateService } from './auth-state.service';

describe('authGuard', () => {
  let authState: jasmine.SpyObj<AuthStateService>;
  let router: Router;

  beforeEach(() => {
    authState = jasmine.createSpyObj('AuthStateService', ['isLoggedIn', 'mustChangePassword']);
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthStateService, useValue: authState }],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function run(url = '/dashboard') {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url } as any)
    );
  }

  it('redirects a logged-out user to /home', () => {
    authState.isLoggedIn.and.returnValue(false);

    const result = run();

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('redirects a restricted (mustChangePassword) user to /change-initial-password instead of the dashboard', () => {
    authState.isLoggedIn.and.returnValue(true);
    authState.mustChangePassword.and.returnValue(true);

    const result = run();

    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/change-initial-password']);
  });

  it('allows a normal logged-in user through', () => {
    authState.isLoggedIn.and.returnValue(true);
    authState.mustChangePassword.and.returnValue(false);

    const result = run();

    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
