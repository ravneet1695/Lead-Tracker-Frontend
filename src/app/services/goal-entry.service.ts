import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GoalEntry {
    _id?: string;
    goal: string;
    user?: any;
    group: string;
    data: any;
    status: string;
    contacts?: Contact[];
    remarks?: string;
    statusHistory?: StatusHistory[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Contact {
    name: string;
    designation?: string;
    email?: string;
    phone?: string;
}

export interface StatusHistory {
    status: string;
    changedAt: Date;
    changedBy?: any;
}

@Injectable({
    providedIn: 'root'
})
export class GoalEntryService {
    private apiUrl = `${environment.apiUrl}/goal-entries`;

    constructor(private http: HttpClient) { }

    getEntries(filters?: any): Observable<any> {
        return this.http.get(this.apiUrl, { params: filters });
    }

    getEntry(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${id}`);
    }

    createEntry(entryData: GoalEntry): Observable<any> {
        return this.http.post(this.apiUrl, entryData);
    }

    updateEntry(id: string, entryData: Partial<GoalEntry>): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, entryData);
    }

    deleteEntry(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    getEntryHistory(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${id}/history`);
    }
}
