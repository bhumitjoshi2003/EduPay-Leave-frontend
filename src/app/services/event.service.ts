import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event } from '../interfaces/event-calendar.component';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private apiUrl = `${environment.apiUrl}/api/events`;

  constructor(private http: HttpClient) { }

  createEvent(event: Event): Observable<Event> {
    return this.http.post<Event>(this.apiUrl, event);
  }

  getEventById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  getEventsForMonthAndYear(year: number, month: number): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}/month/${month}/year/${year}`);
  }

  updateEvent(id: number, event: Event): Observable<Event> {
    return this.http.put<Event>(`${this.apiUrl}/${id}`, event);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}