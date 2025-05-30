import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BusFee {
  id?: number;
  academicYear: string;
  minDistance: number;
  maxDistance: number | null;
  fees: number;
}

@Injectable({
  providedIn: 'root'
})

export class BusFeesService {
  private apiUrl = `${environment.apiUrl}/bus-fees`;

  constructor(private http: HttpClient) { }

  getAcademicYears(): Observable<string[]> {
    return this.http.get<BusFee[]>(this.apiUrl).pipe(
      map(fees => {
        const years = new Set(fees.map(fee => fee.academicYear));
        return Array.from(years).sort();
      })
    );
  }

  getBusFees(year: string): Observable<BusFee[]> {
    return this.http.get<BusFee[]>(`${this.apiUrl}/${year}`);
  }

  getBusFeesOfDistance(distance: number, academicYear: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${distance}/${academicYear}`);
  }

  updateBusFees(year: string, busFees: BusFee[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${year}`, busFees);
  }

  createNewSession(fromSession: string, toSession: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}`, { fromSession, toSession });
  }
}
