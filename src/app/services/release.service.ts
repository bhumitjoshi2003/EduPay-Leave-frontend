import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReleaseNote } from '../interfaces/release-note';

@Injectable({ providedIn: 'root' })
export class ReleaseService {
  private readonly baseUrl = `${environment.apiUrl}/releases`;

  constructor(private http: HttpClient) {}

  /** 200 with a body, or 204 (translated to `null` by the HTTP client) when none applies. */
  getLatest(): Observable<ReleaseNote | null> {
    return this.http.get<ReleaseNote | null>(`${this.baseUrl}/latest`);
  }

  getAll(): Observable<ReleaseNote[]> {
    return this.http.get<ReleaseNote[]>(this.baseUrl);
  }
}
