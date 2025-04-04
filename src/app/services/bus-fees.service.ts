import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:8081/bus-fees';

  constructor(private http: HttpClient) {}

  getAcademicYears(): Observable<string[]> {
    console.log("edce");
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
