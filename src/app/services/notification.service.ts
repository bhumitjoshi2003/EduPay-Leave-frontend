import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../interfaces/notification';
import { environment } from '../../environments/environment';
import { UserNotification } from '../interfaces/user-notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/api/notification`;

  constructor(private http: HttpClient) { }

  createNotification(notification: Notification): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }

  updateNotification(id: number, notification: Notification): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}`, notification);
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/all`);
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getUserNotifications(): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>(`${this.apiUrl}/user`);
  }

  getUnreadNotificationCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/user/unread/count`);
  }

  markAllNotificationsAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/user/read-all`, {});
  }
}