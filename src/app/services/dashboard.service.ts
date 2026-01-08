import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardData {
    role: string;
    user: {
        name: string;
        email: string;
        role: string;
    };
    goalStagesSummary?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private apiUrl = `${environment.apiUrl}/dashboard`;

    constructor(private http: HttpClient) { }

    getDashboardData(): Observable<DashboardData> {
        return this.http.get<DashboardData>(this.apiUrl);
    }

    getOrganizationStats(orgId: string): Observable<any> {
        return this.http.get(`${environment.apiUrl}/organizations/${orgId}/stats`);
    }

    getTeamStats(teamId: string): Observable<any> {
        return this.http.get(`${environment.apiUrl}/teams/${teamId}/stats`);
    }
}
