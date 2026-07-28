
import {
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LocaleService, UiTranslationKey } from '../../../core/locale/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { BrandComponent } from '../../../shared/components/brand/brand.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AssetImageDirective, BrandComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly localeService = inject(LocaleService);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);
  readonly languageMenuOpen = signal(false);
  readonly moreMenuOpen = signal(false);
  readonly localeOptions = this.localeService.options;
  readonly currentLanguage = this.localeService.selectedLocale;

  get profileAvatar(): string | null {
    return this.authService.currentUser()?.avatarUrl ?? null;
  }

  get currentLanguageFlag(): string {
    return this.localeOptions().find(option => option.code === this.currentLanguage())?.flagUrl
      ?? this.flagUrl(this.currentLanguage());
  }

  ngOnInit(): void {
    this.localeService.load();
  }

  translate(key: UiTranslationKey): string {
    return this.localeService.translate(key);
  }

  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.moreMenuOpen.set(false);
    this.languageMenuOpen.update(open => !open);
  }

  toggleMoreMenu(event: Event): void {
    event.stopPropagation();
    this.languageMenuOpen.set(false);
    this.moreMenuOpen.update(open => !open);
  }

  toggleTheme(event: Event): void {
    event.stopPropagation();
    this.closeMenus();
    this.theme.toggle();
  }

  setLanguage(event: Event, language: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.localeService.selectLocale(language);
    this.closeMenus();
  }

  flagUrl(language: string): string {
    const country = language === 'vi' ? 'vn' : language === 'zh' ? 'cn' : 'gb';
    return `https://flagcdn.com/w20/${country}.png`;
  }

  signOut(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeMenus();
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/']),
    });
  }

  closeMenus(): void {
    this.languageMenuOpen.set(false);
    this.moreMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  closeMenusOnOutsideClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-sidebar-language]')) {
      this.languageMenuOpen.set(false);
    }
    if (!target?.closest('[data-sidebar-more]')) {
      this.moreMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeMenusOnEscape(): void {
    this.closeMenus();
  }
}
