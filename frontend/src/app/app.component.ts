import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ThemeService } from './core/theme/theme.service';
import { SearchModalComponent } from './features/search/search-modal.component';
import { AuthModalComponent } from './features/auth/components/auth-modal/auth-modal.component';
import { BrandingService } from './core/theme/branding.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, SearchModalComponent, AuthModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Lingora';

  constructor(themeService: ThemeService, brandingService: BrandingService) {
    // Instantiating the application-wide service restores the saved theme before routed views render.
    themeService.resolvedTheme();
    brandingService.accent();
  }
}
