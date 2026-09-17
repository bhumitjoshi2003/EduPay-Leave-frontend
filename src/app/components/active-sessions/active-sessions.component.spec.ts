import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ActiveSessionsComponent } from './active-sessions.component';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { UserSession } from '../../interfaces/user-session';

describe('ActiveSessionsComponent', () => {
  let component: ActiveSessionsComponent;
  let fixture: ComponentFixture<ActiveSessionsComponent>;
  let sessionServiceSpy: jasmine.SpyObj<SessionService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const currentSession: UserSession = {
    id: 1, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0 Safari/537.36',
    ipAddress: '1.1.1.1', createdAt: '2026-09-16T10:00:00Z', lastUsedAt: '2026-09-17T09:00:00Z',
    expiresAt: '2026-09-24T10:00:00Z', current: true,
  };
  const otherSession: UserSession = {
    id: 2, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0 Safari/537.36',
    ipAddress: '2.2.2.2', createdAt: '2026-09-15T10:00:00Z', lastUsedAt: '2026-09-16T09:00:00Z',
    expiresAt: '2026-09-23T10:00:00Z', current: false,
  };

  beforeEach(async () => {
    sessionServiceSpy = jasmine.createSpyObj('SessionService', ['list', 'revoke', 'revokeOthers']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logoutAll']);
    toastSpy = jasmine.createSpyObj('ToastService', ['confirm', 'success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ActiveSessionsComponent],
      providers: [
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info']) },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveSessionsComponent);
    component = fixture.componentInstance;
  });

  it('shows the loading state before the list resolves', () => {
    sessionServiceSpy.list.and.returnValue(of([]));
    expect(component.loading).toBeTrue();
  });

  it('loads and renders the session list successfully', () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession, otherSession]));
    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(component.loadError).toBeFalse();
    expect(component.sessions.length).toBe(2);
  });

  it('shows an error state (not an indefinite spinner) and supports retry', () => {
    sessionServiceSpy.list.and.returnValue(throwError(() => new Error('network down')));
    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(component.loadError).toBeTrue();

    // list() resolves synchronously here (of(...)), so by the time retry()
    // returns, the transient loading=true has already settled back to false —
    // what matters is that the error clears and the retried data loads.
    sessionServiceSpy.list.and.returnValue(of([currentSession]));
    component.retry();
    expect(component.loading).toBeFalse();
    expect(component.loadError).toBeFalse();
    expect(component.sessions).toEqual([currentSession]);
  });

  it('identifies the current session using only session.current, never device/browser/IP', () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession, otherSession]));
    fixture.detectChanges();

    expect(component.current).toEqual(currentSession);
    expect(component.otherSessions).toEqual([otherSession]);
  });

  it('renders the CURRENT badge and no revoke action for the current session', () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession]));
    fixture.detectChanges();

    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('CURRENT');
    // The current-session block must not offer a "Log out" action.
    const currentBlock = fixture.nativeElement.querySelector('.as-card');
    expect(currentBlock.querySelector('.as-btn-danger-ghost')).toBeNull();
  });

  it('renders a "Log out" button for a non-current session', () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession, otherSession]));
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.as-btn-danger-ghost'));
    expect(buttons.length).toBe(1);
  });

  it('shows "No other active sessions." when only the current session exists', () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No other active sessions.');
  });

  it('revoke: cancelling the confirmation never calls the API', async () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession, otherSession]));
    fixture.detectChanges();
    toastSpy.confirm.and.resolveTo(false);

    await component.revoke(otherSession);

    expect(sessionServiceSpy.revoke).not.toHaveBeenCalled();
  });

  it('revoke: confirming calls the API and removes the session from the list', async () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession, otherSession]));
    fixture.detectChanges();
    toastSpy.confirm.and.resolveTo(true);
    sessionServiceSpy.revoke.and.returnValue(of('Session revoked.'));

    await component.revoke(otherSession);

    expect(sessionServiceSpy.revoke).toHaveBeenCalledWith(otherSession.id);
    expect(component.sessions).toEqual([currentSession]);
  });

  it('revoke-others: confirming calls the API and reloads the list', async () => {
    sessionServiceSpy.list.and.returnValues(
      of([currentSession, otherSession]),
      of([currentSession]),
    );
    fixture.detectChanges();
    toastSpy.confirm.and.resolveTo(true);
    sessionServiceSpy.revokeOthers.and.returnValue(of({ revokedCount: 1 }));

    await component.revokeOthers();

    expect(sessionServiceSpy.revokeOthers).toHaveBeenCalled();
    expect(sessionServiceSpy.list).toHaveBeenCalledTimes(2);
    expect(component.sessions).toEqual([currentSession]);
  });

  it('logout-everywhere: confirming clears auth state (via AuthService.logoutAll) and navigates to /home', async () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession]));
    fixture.detectChanges();
    toastSpy.confirm.and.resolveTo(true);
    authServiceSpy.logoutAll.and.returnValue(of({ revokedCount: 1 }));

    await component.logoutEverywhere();

    expect(authServiceSpy.logoutAll).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('logout-everywhere: cancelling the confirmation never calls the API or navigates', async () => {
    sessionServiceSpy.list.and.returnValue(of([currentSession]));
    fixture.detectChanges();
    toastSpy.confirm.and.resolveTo(false);

    await component.logoutEverywhere();

    expect(authServiceSpy.logoutAll).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
