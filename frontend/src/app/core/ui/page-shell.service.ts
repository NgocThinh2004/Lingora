
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class PageShellService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private previousBodyClass = '';
  private mounted = false;

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#themeToggle, #sidebarThemeToggle, #mobileThemeToggle')) {
      event.preventDefault();
      this.toggleTheme();
      return;
    }

    const language = target.closest<HTMLElement>('[data-lang]')?.dataset['lang'];
    if (language) {
      event.preventDefault();
      this.setLanguage(language);
      return;
    }

    if (target.closest('#signOutBtn, #mobileSignOutBtn')) {
      event.preventDefault();
      this.authService.logout().subscribe({
        complete: () => void this.router.navigateByUrl('/auth/login'),
      });
      return;
    }

    if (target.closest('#quickDraftCard')) {
      void this.router.navigateByUrl('/workspace/create?new=1');
      return;
    }

    const themeOption = target.closest<HTMLElement>('#themeOptions [data-theme]')?.dataset['theme'];
    if (themeOption === 'light' || themeOption === 'dark') {
      localStorage.setItem('theme', themeOption);
      this.applyTheme(themeOption);
      this.updateSelectedOptions();
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    const href = anchor?.getAttribute('href');
    if (anchor && href?.startsWith('/') && !anchor.target && !anchor.hasAttribute('download')) {
      event.preventDefault();
      void this.router.navigateByUrl(href);
    }
  };

  private readonly handleChange = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const settingKeys: Record<string, string> = {
      compactViewSwitch: 'compactView',
      autoPlaySwitch: 'autoPlayMedia',
    };
    const key = settingKeys[input.id];
    if (key) localStorage.setItem(key, String(input.checked));
  };

  mount(title: string, bodyClass = ''): void {
    this.unmount();
    this.previousBodyClass = document.body.className;
    document.title = title;
    document.body.className = bodyClass;
    this.mounted = true;
    document.addEventListener('click', this.handleClick);
    document.addEventListener('change', this.handleChange);
    this.applySavedPreferences();
  }

  unmount(): void {
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('change', this.handleChange);
    if (this.mounted) document.body.className = this.previousBodyClass;
    this.mounted = false;
  }

  toggleTheme(): void {
    const theme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  }

  setLanguage(language: string): void {
    const normalized = ['en', 'vi', 'zh'].includes(language) ? language : 'en';
    localStorage.setItem('preferredLanguage', normalized);
    document.documentElement.lang = normalized;
    this.updateLanguageFlags(normalized);
    this.updateSelectedOptions();
  }

  private applySavedPreferences(): void {
    const savedTheme = localStorage.getItem('theme');
    const theme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this.applyTheme(theme);
    this.setLanguage(localStorage.getItem('preferredLanguage') || 'en');
    this.restoreSwitches();
    this.updateSelectedOptions();
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-bs-theme', theme);
    const dark = theme === 'dark';
    document.querySelectorAll<HTMLElement>('#themeIcon, #sidebarThemeIcon, #mobileThemeIcon').forEach((icon) => {
      icon.className = dark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    });
  }

  private updateLanguageFlags(language: string): void {
    const country = language === 'vi' ? 'vn' : language === 'zh' ? 'cn' : 'gb';
    document.querySelectorAll<HTMLImageElement>('#currentLangFlag, #sidebarLangFlag, #mobileLangFlag').forEach((image) => {
      image.src = `https://flagcdn.com/w20/${country}.png`;
    });
  }

  private restoreSwitches(): void {
    const defaults: Record<string, boolean> = {
      compactViewSwitch: false,
      autoPlaySwitch: true,
    };
    const keys: Record<string, string> = {
      compactViewSwitch: 'compactView',
      autoPlaySwitch: 'autoPlayMedia',
    };
    Object.entries(keys).forEach(([id, key]) => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      if (!input) return;
      const saved = localStorage.getItem(key);
      input.checked = saved === null ? defaults[id] : saved === 'true';
    });
  }

  private updateSelectedOptions(): void {
    const theme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const language = localStorage.getItem('preferredLanguage') || 'en';
    document.querySelectorAll<HTMLElement>('#themeOptions [data-theme]').forEach((option) => {
      option.classList.toggle('active', option.dataset['theme'] === theme);
    });
    document.querySelectorAll<HTMLElement>('#languageOptions [data-lang]').forEach((option) => {
      option.classList.toggle('active', option.dataset['lang'] === language);
    });
  }
}
