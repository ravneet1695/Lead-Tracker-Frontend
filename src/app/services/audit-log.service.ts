import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLog {
    _id: string;
    user: any;
    userName: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    status: string;
    timestamp: Date;
    changes?: {
        before?: any;
        after?: any;
    };
}

export interface AuditLogResponse {
    success: boolean;
    logs: AuditLog[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalLogs: number;
        limit: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    private apiUrl = `${environment.apiUrl}/audit-logs`;

    constructor(private http: HttpClient) { }

    // Get all audit logs with filtering and pagination
    getAuditLogs(filters?: {
        page?: number;
        limit?: number;
        action?: string;
        resourceType?: string;
        userId?: string;
        organizationId?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
    }): Observable<AuditLogResponse> {
        let params = new HttpParams();

        if (filters) {
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.limit) params = params.set('limit', filters.limit.toString());
            if (filters.action) params = params.set('action', filters.action);
            if (filters.resourceType) params = params.set('resourceType', filters.resourceType);
            if (filters.userId) params = params.set('userId', filters.userId);
            if (filters.organizationId) params = params.set('organizationId', filters.organizationId);
            if (filters.startDate) params = params.set('startDate', filters.startDate);
            if (filters.endDate) params = params.set('endDate', filters.endDate);
            if (filters.search) params = params.set('search', filters.search);
        }

        return this.http.get<AuditLogResponse>(this.apiUrl, { params });
    }

    // Get single audit log
    getAuditLog(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${id}`);
    }

    // Get audit logs for specific user
    getUserAuditLogs(userId: string, page: number = 1, limit: number = 50): Observable<AuditLogResponse> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        return this.http.get<AuditLogResponse>(`${this.apiUrl}/user/${userId}`, { params });
    }

    // Get audit logs for specific resource
    getResourceAuditLogs(type: string, id: string, page: number = 1, limit: number = 50): Observable<AuditLogResponse> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        return this.http.get<AuditLogResponse>(`${this.apiUrl}/resource/${type}/${id}`, { params });
    }

    // Get audit log statistics
    getAuditLogStats(startDate?: string, endDate?: string): Observable<any> {
        let params = new HttpParams();

        if (startDate) params = params.set('startDate', startDate);
        if (endDate) params = params.set('endDate', endDate);

        return this.http.get(`${this.apiUrl}/stats/summary`, { params });
    }
}
