import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StudentStreamSelection {
  studentId: string;
  streamId: number;
  streamName: string;
  optionalSubjectId: number;
  optionalSubjectName: string;
}

export interface StudentStreamOverview {
  studentId: string;
  studentName: string;
  streamName: string | null;
  optionalSubjectName: string | null;
}

@Injectable({ providedIn: 'root' })
export class StudentStreamService {
  private base = `${environment.apiUrl}/student-stream`;

  constructor(private http: HttpClient) { }

  getStudentStream(studentId: string): Observable<StudentStreamSelection> {
    return this.http.get<StudentStreamSelection>(`${this.base}/${studentId}`);
  }

  assignStream(studentId: string, streamId: number, optionalSubjectId: number): Observable<StudentStreamSelection> {
    return this.http.post<StudentStreamSelection>(this.base, { studentId, streamId, optionalSubjectId });
  }

  updateStream(studentId: string, streamId: number, optionalSubjectId: number): Observable<StudentStreamSelection> {
    return this.http.put<StudentStreamSelection>(`${this.base}/${studentId}`, { studentId, streamId, optionalSubjectId });
  }

  deleteStream(studentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${studentId}`);
  }

  getClassStreamOverview(className: string): Observable<StudentStreamOverview[]> {
    return this.http.get<StudentStreamOverview[]>(`${this.base}/class/${className}`);
  }
}
