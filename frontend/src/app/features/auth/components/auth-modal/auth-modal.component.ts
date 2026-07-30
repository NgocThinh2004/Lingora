import { Component, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { LocaleService } from '../../../../core/locale/locale.service';
import { LocaleSelectorComponent } from '../../../../shared/components/locale-selector/locale-selector.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, RouterModule, LocaleSelectorComponent, TranslatePipe],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent {
  readonly modalService = inject(AuthModalService);
  private readonly localeService = inject(LocaleService);

  readonly currentLang = computed(() => this.localeService.selectedLocale());
  readonly localeOptions = this.localeService.options;

  close(): void {
    this.modalService.close();
  }

  selectLang(lang: string): void {
    this.localeService.selectLocale(lang);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.modalService.isOpen()) {
      this.close();
    }
  }
}
