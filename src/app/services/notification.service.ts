import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Notification } from '../interfaces/notification';
import { environment } from '../../environments/environment';
import { UserNotification } from '../interfaces/user-notification';
import { AuthStateService } from '../auth/auth-state.service';

export interface NoticePayload {
  title: string;
  subject: string;
  body: string;
  targetClass: string;
  deliveryMode: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  pageable: { pageNumber: number; pageSize: number; };
}

export type UnreadCountStatus = 'loading' | 'success' | 'error';

/** `count` is meaningful only when `status === 'success'` — a `loading`/`error` state must
 *  never be collapsed into a bare `0`, since a genuine zero and "we don't know yet" are
 *  different UI states (see Teacher Dashboard's Updates tile). */
export interface UnreadCountState {
  status: UnreadCountStatus;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notification`;

  /** Single shared source of truth for the unread count, refreshed by the dashboard shell
   *  (on load, on navigation, on its 60s poll, ...) and consumed by anyone who needs to
   *  display it (shell header badge, Teacher Dashboard Daily Insights) — consumers should
   *  read this instead of calling getUnreadNotificationCount() themselves, so the app never
   *  issues more than one in-flight unread-count request per refresh. */
  private readonly unreadCountState$$ = new BehaviorSubject<UnreadCountState>({ status: 'loading', count: 0 });
  readonly unreadCountState$: Observable<UnreadCountState> = this.unreadCountState$$.asObservable();

  constructor(private http: HttpClient, private authState: AuthStateService) {
    // The SPA never fully reloads between sessions on the same tab, so this singleton would
    // otherwise keep the previous user's unread count in memory across a logout — reset it
    // back to "unknown" the moment a session is confirmed gone, from whichever of the several
    // existing clearUser() call sites (explicit logout, 401 interceptor, forced password
    // change) triggered it.
    this.authState.status$
      .pipe(filter(status => status === 'UNAUTHENTICATED'))
      .subscribe(() => this.resetUnreadCount());
  }

  createNotification(notification: Notification): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }

  updateNotification(id: number, notification: Notification): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}`, notification);
  }

  getAllNotifications(page = 0, size = 20): Observable<PagedResponse<Notification>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'createdAt,desc');
    return this.http.get<PagedResponse<Notification>>(`${this.apiUrl}/all`, { params });
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getUserNotifications(page = 0, size = 20): Observable<PagedResponse<UserNotification>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'createdAt,desc');
    return this.http.get<PagedResponse<UserNotification>>(`${this.apiUrl}/user`, { params });
  }

  getUnreadNotificationCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/user/unread/count`);
  }

  /** Fetches the unread count once and publishes the result to unreadCountState$ for every
   *  consumer to share. The dashboard shell is the sole caller of this (on load, on
   *  navigation, on its periodic poll) — other consumers (e.g. Teacher Dashboard) should
   *  subscribe to unreadCountState$ instead of calling this themselves, so a dashboard visit
   *  never triggers a second, redundant HTTP request for the same count. Self-contained
   *  one-shot subscription: the underlying HttpClient observable completes after a single
   *  emission, so this never leaks. */
  refreshUnreadCount(): void {
    this.getUnreadNotificationCount().subscribe({
      next: count => this.unreadCountState$$.next({ status: 'success', count }),
      error: () => this.unreadCountState$$.next({ status: 'error', count: 0 }),
    });
  }

  /** Back to the initial "unknown" state — called on logout so a subsequent session on the
   *  same tab never briefly shows the previous user's unread count before the new session's
   *  first refresh resolves. */
  private resetUnreadCount(): void {
    this.unreadCountState$$.next({ status: 'loading', count: 0 });
  }

  markAllNotificationsAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/user/read-all`, {});
  }

  sendNotice(payload: NoticePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/admin/notice`, payload);
  }
}