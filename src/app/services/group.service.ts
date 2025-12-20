import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Group {
    _id?: string;
    code: string;
    name: string;
    description: string;
    organization?: any;
    users: string[];
    managers: string[];
    isActive?: boolean;
    createdBy?: string;
}

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private apiUrl = `${environment.apiUrl}/groups`;

    constructor(private http: HttpClient) { }

    getGroups(params?: any): Observable<any> {
        return this.http.get<any>(this.apiUrl, { params });
    }

    getGroup(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    getNextGroupCode(params?: any): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/next-code`, { params });
    }

    createGroup(group: Group): Observable<any> {
        return this.http.post<any>(this.apiUrl, group);
    }

    updateGroup(id: string, group: Partial<Group>): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, group);
    }

    deleteGroup(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }

    toggleGroupStatus(id: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/${id}/toggle-status`, {});
    }
}
