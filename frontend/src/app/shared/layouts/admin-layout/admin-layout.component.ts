import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BrandComponent } from '../../components/brand/brand.component';
import { LocaleSelectorComponent } from '../../components/locale-selector/locale-selector.component';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';

interface AdminNavItem {
  label: string;
  icon: string;
  route?: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandComponent, LocaleSelectorComponent, ThemeToggleComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);
  readonly currentUser = this.authService.currentUser;
  selectedLocale = localStorage.getItem('lingora-locale') ?? 'en';
  readonly navItems: AdminNavItem[] = [
    { label: 'Admin Dashboard', icon: 'bi-speedometer2', route: '/admin' },
    { label: 'Manage Users', icon: 'bi-people', route: '/admin/users' },
    { label: 'Manage Posts', icon: 'bi-file-earmark-check' },
    { label: 'Manage Categories', icon: 'bi-tags' },
    { label: 'Manage Languages', icon: 'bi-translate' }
  ];

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  updateLocale(locale: string): void {
    this.selectedLocale = locale;
    localStorage.setItem('lingora-locale', locale);
  }

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/auth/login']),
    });
  }
}
