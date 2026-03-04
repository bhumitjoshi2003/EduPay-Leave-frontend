import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLog {
    id: number;
    username: string;
    role: string;
    action: string;
    entityName: string;
    oldValue: string;
    newValue: string;
    timestamp: string;
    ipAddress: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuditService {

    private apiUrl = `${environment.apiUrl}/api/audit`;

    constructor(private http: HttpClient) { }

    getAuditLogs(page: number, size: number, filters: any): Observable<any> {

        let params = new HttpParams()
            .set('page', page)
            .set('size', size);

        if (filters.username)
            params = params.set('username', filters.username);

        if (filters.action)
            params = params.set('action', filters.action);

        if (filters.entityName)
            params = params.set('entityName', filters.entityName);

        if (filters.startDate)
            params = params.set('startDate', filters.startDate);

        if (filters.endDate)
            params = params.set('endDate', filters.endDate);

        return this.http.get<any>(this.apiUrl, { params });
    }
}