import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { LocaleOption, PublicLanguage } from '../models/locale.model';

const FALLBACK_OPTIONS: readonly LocaleOption[] = [
  { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w40/gb.png', isDefault: true },
  { code: 'vi', label: 'Tiếng Việt', flagUrl: 'https://flagcdn.com/w40/vn.png', isDefault: false },
  { code: 'zh', label: '中文', flagUrl: 'https://flagcdn.com/w40/cn.png', isDefault: false },
];

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/languages`;
  private loaded = false;
  private requestInProgress = false;

  readonly options = signal<readonly LocaleOption[]>(FALLBACK_OPTIONS);
  readonly selectedLocale = signal(this.initialLocale());

  load(force = false): void {
    if (this.requestInProgress || (this.loaded && !force)) {
      return;
    }

    this.requestInProgress = true;
    this.http.get<ApiResponse<PublicLanguage[]>>(this.apiUrl).subscribe({
      next: response => {
        const options = response.data.map(language => this.toLocaleOption(language));
        this.options.set(options.length ? options : FALLBACK_OPTIONS);
        this.loaded = true;
        this.requestInProgress = false;
        this.ensureValidSelection();
      },
      error: () => {
        this.requestInProgress = false;
        this.ensureValidSelection();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  selectLocale(code: string): void {
    const normalizedCode = code.trim().toLowerCase();
    if (!this.options().some(option => option.code === normalizedCode)) {
      return;
    }
    this.storeSelection(normalizedCode);
  }

  private initialLocale(): string {
    const savedLocale = localStorage.getItem('lingora-locale')?.trim().toLowerCase();
    return FALLBACK_OPTIONS.some(option => option.code === savedLocale) ? savedLocale! : 'en';
  }

  private ensureValidSelection(): void {
    const options = this.options();
    if (options.some(option => option.code === this.selectedLocale())) {
      return;
    }

    const fallback = options.find(option => option.isDefault) ?? options[0];
    if (fallback) {
      this.storeSelection(fallback.code);
    }
  }

  private storeSelection(code: string): void {
    this.selectedLocale.set(code);
    localStorage.setItem('lingora-locale', code);
  }

  private toLocaleOption(language: PublicLanguage): LocaleOption {
    const flagCode = language.flagCode?.trim().toLowerCase();
    return {
      code: language.code.trim().toLowerCase(),
      label: language.nativeName || language.name,
      flagUrl: flagCode && /^[a-z]{2}$/.test(flagCode)
        ? `https://flagcdn.com/w40/${flagCode}.png`
        : 'assets/images/lingora-mark.svg',
      isDefault: language.isDefault,
    };
  }
}
