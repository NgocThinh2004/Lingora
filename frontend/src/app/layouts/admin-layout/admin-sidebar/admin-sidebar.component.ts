import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LocaleService } from '../../../core/locale/locale.service';
import { BrandComponent } from '../../../shared/components/brand/brand.component';
import { LocaleSelectorComponent } from '../../../shared/components/locale-selector/locale-selector.component';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

export interface AdminNavItem {
  labelKey: string;
  icon: string;
  route?: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandComponent, LocaleSelectorComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly localeService = inject(LocaleService);
  private readonly router = inject(Router);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  readonly moreMenuOpen = signal(false);
  readonly currentUser = this.authService.currentUser;
  readonly localeOptions = this.localeService.options;
  readonly selectedLocale = this.localeService.selectedLocale;
  readonly navItems: AdminNavItem[] = [
    { labelKey: 'admin_dashboard', icon: 'bi-speedometer2', route: '/admin' },
    { labelKey: 'manage_users', icon: 'bi-people', route: '/admin/users' },
    { labelKey: 'manage_posts', icon: 'bi-file-earmark-check', route: '/admin/posts' },
    { labelKey: 'manage_categories', icon: 'bi-tags', route: '/admin/categories' },
    { labelKey: 'manage_languages', icon: 'bi-translate', route: '/admin/languages' }
  ];

  ngOnInit(): void {
    this.localeService.load();
  }

  toggleMoreMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.moreMenuOpen.update(v => !v);
  }

  closeMoreMenu(): void {
    this.moreMenuOpen.set(false);
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-admin-more]')) {
      this.moreMenuOpen.set(false);
    }
  }

  closeMenu(): void {
    this.close.emit();
  }

  updateLocale(locale: string): void {
    this.localeService.selectLocale(locale);
  }

  logout(): void {
    this.closeMoreMenu();
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/']),
    });
  }
}
