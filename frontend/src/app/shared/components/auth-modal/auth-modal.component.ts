import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthModalService } from './auth-modal.service';
import { LocaleService } from '../../../core/locale/locale.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent {
  readonly modalService = inject(AuthModalService);
  private readonly localeService = inject(LocaleService);

  readonly currentLang = computed(() => this.localeService.selectedLocale());
  readonly showLangDropdown = signal(false);

  readonly currentFlag = computed(() => {
    const lang = this.currentLang();
    if (lang === 'vi') return 'vn';
    if (lang === 'zh') return 'cn';
    return 'gb';
  });

  close(): void {
    this.modalService.close();
    this.showLangDropdown.set(false);
  }

  toggleLangDropdown(): void {
    this.showLangDropdown.update(v => !v);
  }

  selectLang(lang: string): void {
    this.localeService.selectLocale(lang);
    this.showLangDropdown.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.modalService.isOpen()) {
      this.close();
    }
  }
}
