import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../interfaces/notification';
import { environment } from '../../environments/environment';

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
}