import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Organization {
    _id?: string;
    name: string;
    code?: string;
    alias?: string;
    email: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
    };
    logo?: string;
    website?: string;
    description?: string;
    departments?: string[];
    defaultDepartment?: string;
    defaultPassword?: string;
    status?: 'active' | 'inactive';
    admin?: {
        _id: string;
        name: string;
        mobile: string;
    };
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateOrganizationRequest extends Organization {
    adminUser: {
        name: string;
        email: string;
        mobile: string;
        password: string;
    };
}

export interface OrganizationListResponse {
    success: boolean;
    count: number;
    total: number;
    page: number;
    pages: number;
    organizations: Organization[];
}

export interface OrganizationResponse {
    success: boolean;
    message?: string;
    organization?: Organization;
}

@Injectable({
    providedIn: 'root'
})
export class OrganizationService {
    private apiUrl = `${environment.apiUrl}/organizations`;

    constructor(private http: HttpClient) { }

    getOrganizations(params?: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Observable<OrganizationListResponse> {
        let httpParams = new HttpParams();

        if (params) {
            if (params.search) {
                httpParams = httpParams.set('search', params.search);
            }
            if (params.status) {
                httpParams = httpParams.set('status', params.status);
            }
            if (params.page) {
                httpParams = httpParams.set('page', params.page.toString());
            }
            if (params.limit) {
                httpParams = httpParams.set('limit', params.limit.toString());
            }
        }

        return this.http.get<OrganizationListResponse>(this.apiUrl, { params: httpParams });
    }

    getOrganization(id: string): Observable<OrganizationResponse> {
        return this.http.get<OrganizationResponse>(`${this.apiUrl}/${id}`);
    }

    createOrganization(data: CreateOrganizationRequest): Observable<OrganizationResponse> {
        return this.http.post<OrganizationResponse>(this.apiUrl, data);
    }

    updateOrganization(id: string, data: Organization): Observable<OrganizationResponse> {
        return this.http.put<OrganizationResponse>(`${this.apiUrl}/${id}`, data);
    }

    deleteOrganization(id: string): Observable<OrganizationResponse> {
        return this.http.delete<OrganizationResponse>(`${this.apiUrl}/${id}`);
    }

    restoreOrganization(id: string): Observable<OrganizationResponse> {
        return this.http.patch<OrganizationResponse>(`${this.apiUrl}/${id}/restore`, {});
    }

    toggleStatus(id: string, status: string): Observable<OrganizationResponse> {
        return this.http.patch<OrganizationResponse>(`${this.apiUrl}/${id}/status`, { status });
    }

    getNextCode(): Observable<{ code: string }> {
        return this.http.get<{ code: string }>(`${this.apiUrl}/next-code`);
    }
}
