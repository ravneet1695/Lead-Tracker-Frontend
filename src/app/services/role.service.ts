import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Role {
    _id: string;
    name: string;
    label: string;
    description?: string;
    permissions: string[];
    organization?: { _id: string; name: string } | string; // Optional - only for custom roles
    isSystem: boolean;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface RoleListResponse {
    success: boolean;
    count: number;
    roles: Role[];
}

export interface RoleResponse {
    success: boolean;
    message?: string;
    role?: Role;
}

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private apiUrl = `${environment.apiUrl}/roles`;

    constructor(private http: HttpClient) { }

    getAvailablePermissions(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/permissions`);
    }

    getRoles(includeInactive: boolean = false): Observable<RoleListResponse> {
        if (includeInactive) {
            return this.http.get<RoleListResponse>(this.apiUrl, {
                params: { includeInactive: 'true' }
            });
        }
        return this.http.get<RoleListResponse>(this.apiUrl);
    }

    getRolesByOrganization(organizationId: string, includeInactive: boolean = false): Observable<RoleListResponse> {
        const params: any = { organization: organizationId };
        if (includeInactive) {
            params.includeInactive = 'true';
        }
        return this.http.get<RoleListResponse>(this.apiUrl, { params });
    }

    getRole(id: string): Observable<RoleResponse> {
        return this.http.get<RoleResponse>(`${this.apiUrl}/${id}`);
    }

    createRole(data: Partial<Role>): Observable<RoleResponse> {
        return this.http.post<RoleResponse>(this.apiUrl, data);
    }

    updateRole(id: string, data: Partial<Role>): Observable<RoleResponse> {
        return this.http.put<RoleResponse>(`${this.apiUrl}/${id}`, data);
    }

    deleteRole(id: string): Observable<RoleResponse> {
        return this.http.delete<RoleResponse>(`${this.apiUrl}/${id}`);
    }
}
