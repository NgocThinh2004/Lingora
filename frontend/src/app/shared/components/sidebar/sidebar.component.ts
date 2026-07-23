import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

  readonly navItems: NavItem[] = [
    { icon: 'bi-house-door-fill', label: 'Trang chủ', route: '/' },
    { icon: 'bi-compass', label: 'Khám phá', route: '/explore' },
    { icon: 'bi-person-lines-fill', label: 'Subscriptions', route: '/subscriptions' },
    { icon: 'bi-journal-text', label: 'Bài viết của tôi', route: '/my-posts' },
    { icon: 'bi-person', label: 'Hồ sơ', route: '/profile' },
  ];

  readonly languages = [
    { code: 'en', label: 'English', flag: 'gb' },
    { code: 'vi', label: 'Tiếng Việt', flag: 'vn' },
    { code: 'zh', label: '中文', flag: 'cn' },
  ];

  readonly currentUser = computed(() => this.authService.currentUser());
  readonly themeMode = computed(() => this.themeService.mode());
  readonly currentLang = computed(() => this.languageService.current());

  toggleTheme() {
    this.themeService.toggle();
  }

  selectLanguage(code: string) {
    this.languageService.setLanguage(code);
  }

  logout() {
    this.authService.logout();
  }
}
