import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private apiUrl = `${environment.apiUrl}/locations`;

    constructor(private http: HttpClient) { }

    // Get all states
    getStates(): Observable<any> {
        return this.http.get(`${this.apiUrl}/states`);
    }

    // Get cities for a specific state
    getCities(state: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/cities/${encodeURIComponent(state)}`);
    }

    // Get pincodes for a specific city in a state
    getPincodes(state: string, city: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/pincodes/${encodeURIComponent(state)}/${encodeURIComponent(city)}`);
    }

    // Get all location data
    getAllLocationData(): Observable<any> {
        return this.http.get(`${this.apiUrl}/all`);
    }
}
