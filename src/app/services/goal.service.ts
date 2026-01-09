import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Goal {
    _id?: string;
    title: string;
    description: string;
    target: number;
    timeline: {
        startDate: Date;
        endDate: Date;
    };
    organization?: string;
    groups: string[];
    formSchema: any[];
    statusOptions: string[];
    status?: 'active' | 'inactive' | 'completed';
    pointsConfig?: {
        entryCreation: number;
        statusUpdate: number;
        fieldCompletion: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class GoalService {
    private apiUrl = `${environment.apiUrl}/goals`;

    constructor(private http: HttpClient) { }

    getGoals(): Observable<any> {
        return this.http.get<any>(this.apiUrl);
    }

    getGoal(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    createGoal(goal: Goal): Observable<any> {
        return this.http.post<any>(this.apiUrl, goal);
    }

    updateGoal(id: string, goal: Partial<Goal>): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, goal);
    }

    deleteGoal(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }

    getGoalForm(id: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}/form`);
    }
}
