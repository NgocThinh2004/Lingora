import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LocaleService } from '../../../core/locale/locale.service';
import { BrandComponent } from '../brand/brand.component';
import { LocaleSelectorComponent } from '../locale-selector/locale-selector.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

export interface AdminNavItem {
  label: string;
  icon: string;
  route?: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandComponent, LocaleSelectorComponent, ThemeToggleComponent],
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
    { label: 'Admin Dashboard', icon: 'bi-speedometer2', route: '/admin' },
    { label: 'Manage Users', icon: 'bi-people', route: '/admin/users' },
    { label: 'Manage Posts', icon: 'bi-file-earmark-check', route: '/admin/posts' },
    { label: 'Manage Categories', icon: 'bi-tags', route: '/admin/categories' },
    { label: 'Manage Languages', icon: 'bi-translate', route: '/admin/languages' }
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
      complete: () => void this.router.navigate(['/auth/login']),
    });
  }
}
