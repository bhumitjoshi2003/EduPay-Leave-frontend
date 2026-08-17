import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { passwordChangeGuard } from './password-change.guard';
import { AuthStateService } from './auth-state.service';

describe('passwordChangeGuard', () => {
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

  function run() {
    return TestBed.runInInjectionContext(() => passwordChangeGuard({} as any, {} as any));
  }

  it('redirects a logged-out visitor to /home', () => {
    authState.isLoggedIn.and.returnValue(false);

    expect(run()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('redirects a normal (non-restricted) user to /dashboard', () => {
    authState.isLoggedIn.and.returnValue(true);
    authState.mustChangePassword.and.returnValue(false);

    expect(run()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows a restricted (mustChangePassword) user through', () => {
    authState.isLoggedIn.and.returnValue(true);
    authState.mustChangePassword.and.returnValue(true);

    expect(run()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
