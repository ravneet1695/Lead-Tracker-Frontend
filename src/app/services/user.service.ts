import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
    _id?: string;
    code?: string;
    firstName?: string;
    lastName?: string;
    name: string;
    email: string;
    mobile?: string;
    password?: string;
    role: string | { _id: string; name: string; label: string };
    organization?: string | { _id: string; name: string };
    groups?: string[];
    department?: string;
    status: string;
    profileImage?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = `${environment.apiUrl}/users`;

    constructor(private http: HttpClient) { }

    getUsers(params?: any): Observable<any> {
        let queryString = '';
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key]) {
                    searchParams.append(key, params[key]);
                }
            });
            queryString = `?${searchParams.toString()}`;
        }
        return this.http.get<any>(`${this.apiUrl}${queryString}`);
    }

    getUser(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    createUser(user: User | FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}`, user);
    }

    updateUser(id: string, user: Partial<User> | FormData): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, user);
    }

    deleteUser(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }

    activateUser(id: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status: 'active' });
    }

    getNextUserCode(organizationId?: string): Observable<any> {
        let url = `${this.apiUrl}/next-code`;
        if (organizationId) {
            url += `?organization=${organizationId}`;
        }
        return this.http.get<any>(url);
    }
}
