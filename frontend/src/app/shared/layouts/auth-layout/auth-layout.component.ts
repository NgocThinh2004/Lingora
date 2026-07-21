import { Component } from '@angular/core';
import { BrandComponent } from '../../components/brand/brand.component';
import { LocaleSelectorComponent } from '../../components/locale-selector/locale-selector.component';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [BrandComponent, LocaleSelectorComponent, ThemeToggleComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss'
})
export class AuthLayoutComponent {
  selectedLocale = localStorage.getItem('lingora-locale') ?? 'en';

  updateLocale(locale: string): void {
    this.selectedLocale = locale;
    localStorage.setItem('lingora-locale', locale);
  }
}
