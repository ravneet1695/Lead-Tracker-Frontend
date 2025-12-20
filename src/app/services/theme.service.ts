import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly THEME_KEY = 'app-theme';
    private themeSubject: BehaviorSubject<Theme>;
    public theme$: Observable<Theme>;

    constructor() {
        const savedTheme = this.getSavedTheme();
        this.themeSubject = new BehaviorSubject<Theme>(savedTheme);
        this.theme$ = this.themeSubject.asObservable();
        this.applyTheme(savedTheme);
    }

    private getSavedTheme(): Theme {
        const saved = localStorage.getItem(this.THEME_KEY);
        return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    }

    getCurrentTheme(): Theme {
        return this.themeSubject.value;
    }

    setTheme(theme: Theme): void {
        this.themeSubject.next(theme);
        localStorage.setItem(this.THEME_KEY, theme);
        this.applyTheme(theme);
    }

    toggleTheme(): void {
        const newTheme = this.getCurrentTheme() === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    private applyTheme(theme: Theme): void {
        const body = document.body;
        body.classList.remove('light-theme', 'dark-theme');
        body.classList.add(`${theme}-theme`);
    }
}
