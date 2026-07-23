import { Component, OnInit, inject } from '@angular/core';
import { LocaleService } from '../../../core/locale/locale.service';
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
export class AuthLayoutComponent implements OnInit {
  private readonly localeService = inject(LocaleService);
  readonly localeOptions = this.localeService.options;
  readonly selectedLocale = this.localeService.selectedLocale;

  ngOnInit(): void {
    this.localeService.load();
  }

  updateLocale(locale: string): void {
    this.localeService.selectLocale(locale);
  }
}
