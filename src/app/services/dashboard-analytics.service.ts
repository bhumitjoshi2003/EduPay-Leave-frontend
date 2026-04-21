import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  feesCollectedThisMonth: number;
  overdueStudents: number;
  todayAttendanceRate: number;
  pendingLeaves: number;
}

export interface FeeTrend {
  month: string;
  amount: number;
}

export interface ClassStats {
  className: string;
  studentCount: number;
  attendanceRate: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardAnalyticsService {
  private base = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/stats`);
  }

  getFeeTrend(): Observable<FeeTrend[]> {
    return this.http.get<FeeTrend[]>(`${this.base}/fee-trend`);
  }

  getClassStats(): Observable<ClassStats[]> {
    return this.http.get<ClassStats[]>(`${this.base}/class-stats`);
  }
}
