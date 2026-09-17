import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../auth/auth.service';
import { UserSession } from '../../interfaces/user-session';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { deviceLabel } from '../../utils/device-label.util';

/** Lets a signed-in user see and manage their own active sessions — one login
 * instance each, never a physical device (two browsers on the same laptop are
 * two independent sessions). Every action here is scoped to the caller's own
 * account server-side; nothing here can see or touch another user's sessions. */
@Component({
  selector: 'app-active-sessions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-sessions.component.html',
  styleUrl: './active-sessions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActiveSessionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  sessions: UserSession[] = [];
  loading = true;
  loadError = false;
  revokingId: number | null = null;
  revokingOthers = false;
  loggingOutAll = false;

  constructor(
    private sessionService: SessionService,
    private authService: AuthService,
    private toast: ToastService,
    private logger: LoggerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.loading = true;
    this.loadError = false;
    this.cdr.markForCheck();
    this.sessionService.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error loading active sessions:', err);
        this.loading = false;
        this.loadError = true;
        this.cdr.markForCheck();
      },
    });
  }

  retry(): void {
    this.load();
  }

  get current(): UserSession | undefined {
    return this.sessions.find(s => s.current);
  }

  get otherSessions(): UserSession[] {
    return this.sessions.filter(s => !s.current);
  }

  label(session: UserSession): string {
    return deviceLabel(session.userAgent);
  }

  async revoke(session: UserSession): Promise<void> {
    const confirmed = await this.toast.confirm({
      title: 'Log out this session?',
      message: `This will sign out "${this.label(session)}". You can always sign back in there.`,
      confirmText: 'Log out',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    this.revokingId = session.id;
    this.cdr.markForCheck();
    this.sessionService.revoke(session.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.sessions = this.sessions.filter(s => s.id !== session.id);
        this.revokingId = null;
        this.toast.success('Signed out', 'That session has been logged out.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.revokingId = null;
        this.cdr.markForCheck();
        this.logger.error('Error revoking session:', err);
        this.toast.error('Error', 'Could not log out that session. Please try again.');
      },
    });
  }

  async revokeOthers(): Promise<void> {
    const confirmed = await this.toast.confirm({
      title: 'Log out all other sessions?',
      message: 'Every other place you\'re signed in will be logged out. This session stays signed in.',
      confirmText: 'Log out others',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    this.revokingOthers = true;
    this.cdr.markForCheck();
    this.sessionService.revokeOthers().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.revokingOthers = false;
        this.toast.success('Signed out everywhere else', 'Only this session remains signed in.');
        this.load();
      },
      error: (err) => {
        this.revokingOthers = false;
        this.cdr.markForCheck();
        this.logger.error('Error revoking other sessions:', err);
        this.toast.error('Error', 'Could not log out other sessions. Please try again.');
      },
    });
  }

  async logoutEverywhere(): Promise<void> {
    const confirmed = await this.toast.confirm({
      title: 'Log out everywhere?',
      message: 'This signs you out of every device and browser, including this one. You will need to sign in again.',
      confirmText: 'Log out everywhere',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    this.loggingOutAll = true;
    this.cdr.markForCheck();
    this.authService.logoutAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        this.loggingOutAll = false;
        this.cdr.markForCheck();
        this.logger.error('Error logging out everywhere:', err);
        this.toast.error('Error', 'Could not log out everywhere. Please try again.');
      },
    });
  }
}
