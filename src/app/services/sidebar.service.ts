import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SidebarService {
    private isCollapsedSubject = new BehaviorSubject<boolean>(false);
    public isCollapsed$: Observable<boolean> = this.isCollapsedSubject.asObservable();

    constructor() { }

    toggleSidebar(): void {
        this.isCollapsedSubject.next(!this.isCollapsedSubject.value);
    }

    setSidebarState(collapsed: boolean): void {
        this.isCollapsedSubject.next(collapsed);
    }

    getSidebarState(): boolean {
        return this.isCollapsedSubject.value;
    }
}
