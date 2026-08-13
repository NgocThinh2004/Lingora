import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../http/api-response.model';
import { LocaleOption, PublicLanguage } from './locale.model';

const FALLBACK_OPTIONS: readonly LocaleOption[] = [
  { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w40/gb.png', isDefault: true },
  { code: 'vi', label: 'Tiếng Việt', flagUrl: 'https://flagcdn.com/w40/vn.png', isDefault: false },
  { code: 'zh', label: '中文', flagUrl: 'https://flagcdn.com/w40/cn.png', isDefault: false },
];

export type UiTranslationKey = string;
type UiLocaleBundle = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiUrl = `${environment.apiUrl}/languages`;
  private readonly localeAssetsUrl = '/locales';
  private loaded = false;
  private requestInProgress = false;
  private readonly bundleRequests = new Set<string>();
  private readonly loadedBundleCodes = new Set<string>();
  private readonly bundleLoadedCallbacks = new Map<string, Array<() => void>>();
  private requestedLocaleCode = this.initialLocale();

  readonly bundles = signal<Record<string, UiLocaleBundle>>({});
  readonly options = signal<readonly LocaleOption[]>(FALLBACK_OPTIONS);
  // Expose the persisted choice immediately. Routed components can issue API
  // requests before the asynchronous language catalog/static bundle finishes
  // loading; starting at a hard-coded `en` made those first requests fetch the
  // English post after F5 even though the interface later switched to Vietnamese.
  readonly selectedLocale = signal(this.requestedLocaleCode ?? 'en');
  readonly current = this.selectedLocale.asReadonly();

  constructor() {
    this.applyDocumentLanguage(this.selectedLocale());
  }

  load(force = false): void {
    if (!this.http || this.requestInProgress || (this.loaded && !force)) {
      return;
    }

    this.requestInProgress = true;
    this.http.get<ApiResponse<PublicLanguage[]>>(this.apiUrl).subscribe({
      next: response => {
        const options = response.data.map(language => this.toLocaleOption(language));
        this.options.set(options.length ? options : FALLBACK_OPTIONS);
        this.loaded = true;
        this.requestInProgress = false;
        this.activateRequestedLocale(force);
      },
      error: () => {
        this.requestInProgress = false;
        this.activateRequestedLocale(force);
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  findAll(): Observable<PublicLanguage[]> {
    if (!this.http) {
      return of([]);
    }
    return this.http.get<ApiResponse<PublicLanguage[]>>(this.apiUrl).pipe(
      map(response => response.data),
      tap(languages => {
        const options = languages.map(language => this.toLocaleOption(language));
        this.options.set(options.length ? options : FALLBACK_OPTIONS);
        this.loaded = true;
        this.activateRequestedLocale();
      }),
    );
  }

  setLanguage(code: string, onApplied?: () => void): void {
    this.requestSelection(code.trim().toLowerCase(), onApplied);
  }

  selectLocale(code: string, onApplied?: () => void): void {
    const normalizedCode = code.trim().toLowerCase();
    if (!this.options().some(option => option.code === normalizedCode)) {
      return;
    }
    this.requestSelection(normalizedCode, onApplied);
  }

  hasStaticBundle(code: string): Observable<boolean> {
    const normalizedCode = code.trim().toLowerCase();
    if (!this.http || !normalizedCode) {
      return of(false);
    }
    if (this.loadedBundleCodes.has(normalizedCode)) {
      return of(true);
    }
    return this.http.get<UiLocaleBundle>(this.bundleUrl(normalizedCode)).pipe(
      tap(bundle => this.storeBundle(normalizedCode, bundle)),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  translate(key: UiTranslationKey, params?: Record<string, string | number>): string {
    const locale = this.selectedLocale();
    const dictionaries = this.bundles();
    const value = dictionaries[locale]?.[key] ?? dictionaries['en']?.[key] ?? key;
    if (!params) return value;
    return Object.entries(params).reduce(
      (message, [name, replacement]) => message.split(`{${name}}`).join(String(replacement)),
      value,
    );
  }

  private initialLocale(): string | null {
    const savedLocale = (
      localStorage.getItem('preferredLanguage') ??
      localStorage.getItem('lingora-locale')
    )?.trim().toLowerCase();
    return savedLocale && /^[a-z]{2,3}(?:-[a-z0-9]{2,6})?$/.test(savedLocale)
      ? savedLocale
      : null;
  }

  private activateRequestedLocale(forceBundleReload = false, onApplied?: () => void): void {
    const options = this.options();
    const requested = this.requestedLocaleCode
      ? options.find(option => option.code === this.requestedLocaleCode)
      : undefined;
    const target = requested ?? options.find(option => option.isDefault) ?? options[0];
    if (!target) return;
    this.requestedLocaleCode = target.code;
    this.loadBundle(target.code, () => {
      if (this.requestedLocaleCode === target.code) {
        this.storeSelection(target.code);
        onApplied?.();
      }
    }, forceBundleReload);
  }

  private requestSelection(code: string, onApplied?: () => void): void {
    this.requestedLocaleCode = code;
    this.activateRequestedLocale(true, onApplied);
  }

  private storeSelection(code: string): void {
    this.selectedLocale.set(code);
    localStorage.setItem('lingora-locale', code);
    localStorage.setItem('preferredLanguage', code);
    this.applyDocumentLanguage(code);
    window.dispatchEvent(new CustomEvent('lingora:languagechange', {
      detail: { language: code },
    }));
  }

  private loadBundle(code: string, onLoaded?: () => void, force = false): void {
    const normalizedCode = code.trim().toLowerCase();
    if (!this.http || !normalizedCode) {
      return;
    }
    if (!force && this.loadedBundleCodes.has(normalizedCode)) {
      onLoaded?.();
      return;
    }
    if (onLoaded) {
      const callbacks = this.bundleLoadedCallbacks.get(normalizedCode) ?? [];
      callbacks.push(onLoaded);
      this.bundleLoadedCallbacks.set(normalizedCode, callbacks);
    }
    if (this.bundleRequests.has(normalizedCode)) return;
    this.bundleRequests.add(normalizedCode);
    this.http.get<UiLocaleBundle>(this.bundleUrl(normalizedCode)).subscribe({
      next: bundle => {
        this.storeBundle(normalizedCode, bundle);
        this.bundleRequests.delete(normalizedCode);
        const callbacks = this.bundleLoadedCallbacks.get(normalizedCode) ?? [];
        this.bundleLoadedCallbacks.delete(normalizedCode);
        callbacks.forEach(callback => callback());
      },
      error: () => {
        this.bundleRequests.delete(normalizedCode);
        this.bundleLoadedCallbacks.delete(normalizedCode);
      },
    });
  }

  private storeBundle(code: string, bundle: UiLocaleBundle): void {
    this.bundles.update(bundles => ({
      ...bundles,
      [code]: bundle,
    }));
    this.loadedBundleCodes.add(code);
  }

  private bundleUrl(code: string): string {
    return `${this.localeAssetsUrl}/${encodeURIComponent(code)}.json`;
  }

  private applyDocumentLanguage(code: string): void {
    document.documentElement.lang = code === 'zh' ? 'zh-CN' : code;
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
