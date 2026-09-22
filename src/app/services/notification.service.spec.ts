import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';

import { NotificationService, UnreadCountState } from './notification.service';
import { AuthStateService, AuthStatus } from '../auth/auth-state.service';
import { environment } from '../../environments/environment';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;
  let status$$: Subject<AuthStatus>;

  const unreadUrl = `${environment.apiUrl}/notification/user/unread/count`;

  beforeEach(() => {
    status$$ = new Subject<AuthStatus>();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthStateService, useValue: { status$: status$$.asObservable() } },
      ],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Shared unread-count state — the single source every dashboard/shell reads from ───

  it('starts in a loading/unknown state before any refresh has resolved', () => {
    let latest: UnreadCountState | undefined;
    service.unreadCountState$.subscribe(state => (latest = state));
    expect(latest).toEqual({ status: 'loading', count: 0 });
  });

  it('refreshUnreadCount() issues exactly one GET and publishes a success state to every subscriber', () => {
    const states: UnreadCountState[] = [];
    service.unreadCountState$.subscribe(s => states.push(s));

    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush(5);

    expect(states[states.length - 1]).toEqual({ status: 'success', count: 5 });
  });

  it('publishes a genuine zero as a success state, not the initial loading state', () => {
    const states: UnreadCountState[] = [];
    service.unreadCountState$.subscribe(s => states.push(s));

    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush(0);

    expect(states[states.length - 1]).toEqual({ status: 'success', count: 0 });
  });

  it('a fetch failure publishes an error state — never collapsed into a false zero', () => {
    const states: UnreadCountState[] = [];
    service.unreadCountState$.subscribe(s => states.push(s));

    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(states[states.length - 1].status).toBe('error');
  });

  it('a later successful refresh recovers from a previous failure', () => {
    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush('boom', { status: 500, statusText: 'Server Error' });

    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush(2);

    let latest: UnreadCountState | undefined;
    service.unreadCountState$.subscribe(state => (latest = state));
    expect(latest).toEqual({ status: 'success', count: 2 });
  });

  it('every subscriber immediately receives the latest known state, including late subscribers', () => {
    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush(9);

    let latest: UnreadCountState | undefined;
    service.unreadCountState$.subscribe(state => (latest = state));
    expect(latest).toEqual({ status: 'success', count: 9 });
  });

  // ─── Logout / session reset safety ───

  it('resets to loading/unknown when the session becomes UNAUTHENTICATED (logout)', () => {
    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush(7);

    status$$.next('UNAUTHENTICATED');

    let latest: UnreadCountState | undefined;
    service.unreadCountState$.subscribe(state => (latest = state));
    expect(latest).toEqual({ status: 'loading', count: 0 });
  });

  it('does not reset on other auth status transitions (e.g. a routine re-verify)', () => {
    service.refreshUnreadCount();
    http.expectOne(unreadUrl).flush(4);

    status$$.next('AUTHENTICATED');

    let latest: UnreadCountState | undefined;
    service.unreadCountState$.subscribe(state => (latest = state));
    expect(latest).toEqual({ status: 'success', count: 4 });
  });
});
