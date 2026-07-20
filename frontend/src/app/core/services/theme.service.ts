import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'lingora-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly browser: boolean;
  private readonly preferenceSignal = signal<ThemePreference>('system');

  readonly preference = this.preferenceSignal.asReadonly();

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.browser = isPlatformBrowser(this.platformId);

    if (!this.browser) {
      return;
    }

    const storedPreference = localStorage.getItem(THEME_STORAGE_KEY);
    if (this.isThemePreference(storedPreference)) {
      this.preferenceSignal.set(storedPreference);
    }

    this.applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.preferenceSignal() === 'system') {
        this.applyTheme();
      }
    });
  }

  toggle(): void {
    const nextTheme = this.resolvedTheme() === 'dark' ? 'light' : 'dark';
    this.setPreference(nextTheme);
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);

    if (this.browser) {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
      this.applyTheme();
    }
  }

  resolvedTheme(): 'light' | 'dark' {
    if (!this.browser) {
      return 'light';
    }

    const preference = this.preferenceSignal();
    if (preference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return preference;
  }

  private applyTheme(): void {
    this.document.documentElement.setAttribute('data-bs-theme', this.resolvedTheme());
    this.document.documentElement.style.colorScheme = this.resolvedTheme();
  }

  private isThemePreference(value: string | null): value is ThemePreference {
    return value === 'light' || value === 'dark' || value === 'system';
  }
}
