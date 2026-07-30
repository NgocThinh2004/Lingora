import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../../core/theme/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  readonly isDark = computed(() => {
    this.themeService.preference();
    return this.themeService.resolvedTheme() === 'dark';
  });

  toggle(): void {
    this.themeService.toggle();
  }
}
