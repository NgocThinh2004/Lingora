import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { AppSidebarComponent } from '../../shared/components/app-sidebar.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [AppSidebarComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);

  ngOnInit(): void {
    this.ui.mount('Settings & Preferences - Lingora');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }
}
