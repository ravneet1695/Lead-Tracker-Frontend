import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class BreadcrumbService {
    private labels = new BehaviorSubject<{ [key: string]: string }>({});
    labels$ = this.labels.asObservable();

    constructor() { }

    /**
     * Sets a custom label for a specific URL segment (usually an ID)
     * @param segment The URL segment (e.g., an ID)
     * @param label The friendly label to display (e.g., User Code)
     */
    setLabel(segment: string, label: string): void {
        const current = this.labels.value;
        if (current[segment] !== label) {
            this.labels.next({ ...current, [segment]: label });
        }
    }

    /**
     * Gets the custom label for a specific segment if it exists
     * @param segment The URL segment
     */
    getLabel(segment: string): string | null {
        return this.labels.value[segment] || null;
    }

    /**
     * Clears all custom labels or a specific one
     * @param segment Optional segment to clear
     */
    clear(segment?: string): void {
        if (segment) {
            const current = { ...this.labels.value };
            delete current[segment];
            this.labels.next(current);
        } else {
            this.labels.next({});
        }
    }
}
