import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DeliveryChannel, DeliveryDetail, DeliveryFilters, DeliveryRowPage } from '../interfaces/notification-delivery';

/** SUPER_ADMIN only — cross-school notification delivery visibility. */
@Injectable({ providedIn: 'root' })
export class NotificationDeliveryService {
  private readonly baseUrl = `${environment.apiUrl}/notification-deliveries`;

  constructor(private http: HttpClient) {}

  search(page: number, size: number, filters: DeliveryFilters): Observable<DeliveryRowPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    const add = (key: string, value: string | number | null | undefined) => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') params = params.set(key, `${value}`.trim());
    };
    add('status', filters.status);
    add('channel', filters.channel);
    add('eventCode', filters.eventCode);
    add('schoolId', filters.schoolId);
    add('recipient', filters.recipient);
    add('from', filters.from);
    add('to', filters.to);
    return this.http.get<DeliveryRowPage>(this.baseUrl, { params });
  }

  eventCodes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/event-codes`);
  }

  detail(channel: DeliveryChannel, id: number): Observable<DeliveryDetail> {
    return this.http.get<DeliveryDetail>(`${this.baseUrl}/${channel}/${id}`);
  }
}
