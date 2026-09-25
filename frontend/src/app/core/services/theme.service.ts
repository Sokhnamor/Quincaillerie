import { Injectable, effect, signal } from '@angular/core';

const THEME_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal<boolean>(this.initial());

  constructor() {
    effect(() => {
      const dark = this.dark();
      document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
      } catch {
        // storage unavailable: theme simply won't persist
      }
    });
  }

  toggle(): void {
    this.dark.update(v => !v);
  }

  private initial(): boolean {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) {
        return stored === 'dark';
      }
    } catch {
      // ignore
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
