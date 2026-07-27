import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { ThemeService } from './theme.service';

const DEFAULT_ACCENT = '#FF6719';
const ACCENT_STORAGE_KEY = 'lingora-brand-accent';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly browser: boolean;
  private readonly accentSignal = signal(DEFAULT_ACCENT);

  readonly accent = this.accentSignal.asReadonly();

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) platformId: object,
    private readonly themeService: ThemeService,
  ) {
    this.browser = isPlatformBrowser(platformId);
    if (!this.browser) {
      return;
    }

    this.accentSignal.set(this.normalizeHex(localStorage.getItem(ACCENT_STORAGE_KEY) || '') || DEFAULT_ACCENT);
    effect(() => {
      this.themeService.preference();
      this.applyAccentVariables(this.accentSignal());
    });
  }

  setAccent(color: string, persist = true): void {
    const accent = this.normalizeHex(color) || DEFAULT_ACCENT;
    this.accentSignal.set(accent);
    if (this.browser && persist) {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    }
  }

  private applyAccentVariables(color: string): void {
    const root = this.document.documentElement;
    const accent = this.normalizeHex(color);
    if (!accent) {
      return;
    }

    const luminance = this.relativeLuminance(accent);
    const darkTheme = root.getAttribute('data-bs-theme') === 'dark';
    const lightOnLight = !darkTheme && luminance > 0.92;
    const darkOnDark = darkTheme && luminance < 0.08;
    const uiAccent = lightOnLight ? '#59636F' : darkOnDark ? '#AAB2BD' : accent;
    const borderAccent = lightOnLight ? '#98A2B3' : darkOnDark ? '#667085' : accent;
    const hover = lightOnLight
      ? '#F2F4F7'
      : this.shiftColor(accent, luminance > 0.58 ? -0.18 : 0.16);
    const contrast = luminance > 0.58 ? '#141616' : '#FFFFFF';

    root.dataset['accentContrast'] = lightOnLight
      ? 'light-on-light'
      : darkOnDark
        ? 'dark-on-dark'
        : 'normal';
    root.dataset['accentTone'] = luminance > 0.92 ? 'light' : luminance < 0.08 ? 'dark' : 'normal';
    root.style.setProperty('--brand-accent-color', accent);
    root.style.setProperty('--primary-color', accent);
    root.style.setProperty('--primary-hover', hover);
    root.style.setProperty('--accent-ui-color', uiAccent);
    root.style.setProperty('--accent-border-color', borderAccent);
    root.style.setProperty(
      '--accent-button-bg',
      lightOnLight ? '#FFFFFF' : this.toRgba(accent, darkTheme ? 0.16 : 0.1),
    );
    root.style.setProperty('--accent-button-text', uiAccent);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-strong', hover);
    root.style.setProperty('--accent-contrast', contrast);
  }

  private normalizeHex(value: string): string {
    const normalized = value.trim().toUpperCase();
    return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : '';
  }

  private relativeLuminance(color: string): number {
    const channels = this.channels(color);
    return (0.2126 * channels.red + 0.7152 * channels.green + 0.0722 * channels.blue) / 255;
  }

  private shiftColor(color: string, amount: number): string {
    const channels = this.channels(color);
    const shift = (value: number) => {
      const target = amount < 0 ? 0 : 255;
      return Math.round(value + (target - value) * Math.abs(amount));
    };
    return `#${[shift(channels.red), shift(channels.green), shift(channels.blue)]
      .map(value => value.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
  }

  private toRgba(color: string, alpha: number): string {
    const channels = this.channels(color);
    return `rgba(${channels.red}, ${channels.green}, ${channels.blue}, ${alpha})`;
  }

  private channels(color: string): { red: number; green: number; blue: number } {
    const hex = this.normalizeHex(color).slice(1);
    return {
      red: Number.parseInt(hex.slice(0, 2), 16),
      green: Number.parseInt(hex.slice(2, 4), 16),
      blue: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
}
