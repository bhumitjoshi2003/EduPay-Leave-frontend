import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { ChangeInitialPasswordComponent } from './change-initial-password.component';
import { AuthService } from '../../auth/auth.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { ToastService } from '../../services/toast.service';

describe('ChangeInitialPasswordComponent', () => {
  let component: ChangeInitialPasswordComponent;
  let fixture: ComponentFixture<ChangeInitialPasswordComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let authState: jasmine.SpyObj<AuthStateService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['changeInitialPassword', 'logout']);
    authState = jasmine.createSpyObj('AuthStateService', ['getUser', 'getUserId', 'clearUser']);
    authState.getUser.and.returnValue({ userId: 'S1', name: 'Test Student' } as any);
    toast = jasmine.createSpyObj('ToastService', ['error', 'confirm']);
    toast.confirm.and.returnValue(Promise.resolve(true));
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ChangeInitialPasswordComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthStateService, useValue: authState },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeInitialPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('flags a mismatch between new password and confirmation', () => {
    component.form.patchValue({ newPassword: 'Strong1Pass', confirmPassword: 'Different1' });
    expect(component.form.hasError('passwordMismatch')).toBeTrue();
  });

  it('flags a password that does not meet the strength policy', () => {
    component.form.patchValue({ newPassword: 'weak', confirmPassword: 'weak' });
    expect(component.form.get('newPassword')?.hasError('passwordWeak')).toBeTrue();
  });

  it('does not submit while the form is invalid', () => {
    component.form.patchValue({ newPassword: 'Strong1Pass', confirmPassword: 'Different1' });
    component.onSubmit();
    expect(authService.changeInitialPassword).not.toHaveBeenCalled();
  });

  it('clears auth state and redirects to /home on success', () => {
    authService.changeInitialPassword.and.returnValue(of('Password changed successfully.'));
    component.form.patchValue({ newPassword: 'Strong1Pass', confirmPassword: 'Strong1Pass' });

    component.onSubmit();

    expect(authService.changeInitialPassword).toHaveBeenCalledWith({
      newPassword: 'Strong1Pass', confirmPassword: 'Strong1Pass'
    });
    expect(authState.clearUser).toHaveBeenCalled();
    expect(toast.confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      message: jasmine.stringMatching(/sign in with your new password/),
    }));
  });

  it('shows an error toast and does not clear auth state when the backend rejects the change', () => {
    authService.changeInitialPassword.and.returnValue(throwError(() => ({ error: 'New password must be different from your temporary password.' })));
    component.form.patchValue({ newPassword: 'Strong1Pass', confirmPassword: 'Strong1Pass' });

    component.onSubmit();

    expect(authState.clearUser).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Could Not Change Password', 'New password must be different from your temporary password.');
    expect(component.loading).toBeFalse();
  });

  it('prevents a duplicate submit while a request is in flight', () => {
    component.loading = true;
    component.form.patchValue({ newPassword: 'Strong1Pass', confirmPassword: 'Strong1Pass' });

    component.onSubmit();

    expect(authService.changeInitialPassword).not.toHaveBeenCalled();
  });
});
