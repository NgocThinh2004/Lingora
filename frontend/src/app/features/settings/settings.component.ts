import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocaleService } from '../../core/locale/locale.service';
import { PublicLanguage } from '../../core/locale/locale.model';
import { ToastService } from '../../core/notifications/toast.service';
import { UserPreferenceKey } from '../../core/preferences/user-preferences.model';
import { UserPreferencesService } from '../../core/preferences/user-preferences.service';
import { ThemePreference, ThemeService } from '../../core/theme/theme.service';
import { UiStateComponent } from '../../shared/components/ui-state/ui-state.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface ThemeOption {
  value: Exclude<ThemePreference, 'system'>;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, UiStateComponent, TranslatePipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LocaleService);
  private readonly toastService = inject(ToastService);
  private readonly userPreferencesService = inject(UserPreferencesService);

  readonly preferences = this.userPreferencesService.preferences;
  readonly currentLanguage = this.languageService.current;
  readonly languages = signal<readonly PublicLanguage[]>([]);
  readonly languagesLoading = signal(true);
  readonly languagesError = signal(false);
  readonly activeTheme = computed(() => {
    const preference = this.themeService.preference();
    return preference === 'system' ? this.themeService.resolvedTheme() : preference;
  });

  readonly adminContext = this.route.snapshot.data['settingsContext'] === 'admin';
  readonly backRoute = this.adminContext ? '/admin' : '/';
  readonly backLabelKey = this.adminContext ? 'back_to_admin' : 'back_to_feed';

  readonly themeOptions: readonly ThemeOption[] = [
    {
      value: 'light',
      icon: 'bi-sun',
      titleKey: 'theme_light',
      descriptionKey: 'theme_light_description',
    },
    {
      value: 'dark',
      icon: 'bi-moon-stars',
      titleKey: 'theme_dark',
      descriptionKey: 'theme_dark_description',
    },
  ];

  ngOnInit(): void {
    this.loadLanguages();
  }

  loadLanguages(): void {
    this.languagesLoading.set(true);
    this.languagesError.set(false);

    this.languageService.findAll().subscribe({
      next: languages => {
        this.languages.set(languages);
        this.languagesLoading.set(false);

        if (!languages.some(language => language.code === this.currentLanguage())) {
          const fallback = languages.find(language => language.isDefault) ?? languages[0];
          if (fallback) {
            this.languageService.setLanguage(fallback.code);
          }
        }
      },
      error: () => {
        this.languages.set([]);
        this.languagesLoading.set(false);
        this.languagesError.set(true);
      },
    });
  }

  selectTheme(theme: Exclude<ThemePreference, 'system'>): void {
    this.themeService.setPreference(theme);
    this.toastService.showSuccess(this.languageService.translate(theme === 'dark' ? 'theme_dark' : 'theme_light'));
  }

  selectLanguage(language: PublicLanguage): void {
    this.languageService.setLanguage(language.code);
    this.toastService.showSuccess(`${this.languageService.translate('feed_language')}: ${language.nativeName || language.name}`);
  }

  updatePreference(key: UserPreferenceKey, event: Event, messageKey: string): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.userPreferencesService.update(key, enabled);
    this.toastService.showSuccess(this.languageService.translate(messageKey));
  }
}
