import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LeadStatus {
    name: string;
    color: string;
    order: number;
    isDefault: boolean;
}

export interface CustomField {
    name: string;
    type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
    required: boolean;
    options?: string[];
}

export interface MasterConfig {
    _id?: string;
    organization: string;
    leadSources: string[];
    leadStatuses: LeadStatus[];
    productCategories: string[];
    customFields: CustomField[];
    departments: string[];
    tags: string[];
    settings: {
        businessHours: {
            start: string;
            end: string;
        };
        notifications: {
            email: boolean;
            sms: boolean;
        };
    };
    createdAt?: Date;
    updatedAt?: Date;
}

@Injectable({
    providedIn: 'root'
})
export class MasterConfigService {
    private apiUrl = `${environment.apiUrl}/master-config`;

    constructor(private http: HttpClient) { }

    getConfig(organizationId?: string): Observable<any> {
        let url = this.apiUrl;
        if (organizationId) {
            url += `?organization=${organizationId}`;
        }
        return this.http.get(url);
    }

    updateConfig(config: Partial<MasterConfig>): Observable<any> {
        return this.http.put(`${this.apiUrl}`, config);
    }

    seedDefaultConfig(): Observable<any> {
        return this.http.post(`${this.apiUrl}/seed`, {});
    }
}
