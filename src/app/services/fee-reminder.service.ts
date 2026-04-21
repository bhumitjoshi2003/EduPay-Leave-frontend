import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OverdueStudent } from '../interfaces/fee-reminder';

@Injectable({ providedIn: 'root' })
export class FeeReminderService {
  private baseUrl = `${environment.apiUrl}/student-fees`;

  constructor(private http: HttpClient) {}

  getOverdueStudents(session: string, className?: string): Observable<OverdueStudent[]> {
    let params = new HttpParams().set('session', session);
    if (className) params = params.set('className', className);
    return this.http.get<OverdueStudent[]>(`${this.baseUrl}/overdue`, { params });
  }

  sendReminder(studentId: string, session: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reminders/send`, { studentId, session });
  }

  sendBulkReminders(studentIds: string[], session: string): Observable<{ sent: number }> {
    return this.http.post<{ sent: number }>(`${this.baseUrl}/reminders/send-bulk`, { studentIds, session });
  }
}
