import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface BusFee {
  id: number;
  academicYear: string;
  fees: number;
  minDistance: number;
  maxDistance: number;
}


@Injectable({
  providedIn: 'root'
})
export class BusFeesService {

  private apiUrl = 'http://localhost:8081/bus-fees';

  constructor(private http: HttpClient) {}

  getBusFees(year: string): Observable<BusFee[]> {
    return this.http.get<BusFee[]>(`${this.apiUrl}/${year}`);
  } 
}
