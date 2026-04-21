import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TimetableEntry } from '../interfaces/timetable';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private baseUrl = `${environment.apiUrl}/timetable`;

  constructor(private http: HttpClient) {}

  getClassTimetable(className: string): Observable<TimetableEntry[]> {
    return this.http.get<TimetableEntry[]>(`${this.baseUrl}/class/${className}`);
  }

  getTeacherTimetable(teacherId: string): Observable<TimetableEntry[]> {
    return this.http.get<TimetableEntry[]>(`${this.baseUrl}/teacher/${teacherId}`);
  }

  createEntry(entry: TimetableEntry): Observable<TimetableEntry> {
    return this.http.post<TimetableEntry>(this.baseUrl, entry);
  }

  updateEntry(id: number, entry: TimetableEntry): Observable<TimetableEntry> {
    return this.http.put<TimetableEntry>(`${this.baseUrl}/${id}`, entry);
  }

  deleteEntry(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
