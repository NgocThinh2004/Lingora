import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit(): void {
    this.ui.mount('Profile - Lingora');
  }

  ngAfterViewInit(): void {
    const saved = this.readUser();
    this.input('#displayName').value = saved.displayName;
    this.input('#username').value = saved.handle;
    this.textarea('#bio').value = saved.bio;
    this.renderProfile(saved);
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  @HostListener('click', ['$event'])
  handleClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('[data-edit-profile]')) return this.showEditor(true);
    if (target.closest('[data-done-edit]')) return this.saveProfile();
    if (target.closest('[data-profile-more-button]')) return this.toggle('[data-profile-more-menu]');
    if (target.closest('[data-open-password-modal]')) return this.setHidden('[data-password-modal]', false);
    if (target.closest('[data-close-password-modal]')) return this.setHidden('[data-password-modal]', true);
    if (target.closest('[data-locked-handle]')) return this.setHidden('[data-handle-modal]', false);
    if (target.closest('[data-close-handle-modal]')) return this.setHidden('[data-handle-modal]', true);
    if (target.closest('[data-update-handle]')) return this.updateHandle();
    if (target.closest('[data-avatar-button]')) return this.input('#avatarInput').click();
    if (target.closest('#btnSeeSubscribers')) {
      event.preventDefault();
      return this.setHidden('#subscribersModal', false);
    }
    if (target.closest('#closeSubscribersModalBtn, #closeSubscribersModalBg')) {
      return this.setHidden('#subscribersModal', true);
    }

    const togglePassword = target.closest<HTMLButtonElement>('[data-toggle-password]');
    if (togglePassword) {
      const input = togglePassword.parentElement?.querySelector<HTMLInputElement>('input');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        const icon = togglePassword.querySelector('i');
        if (icon) icon.className = input.type === 'text' ? 'bi bi-eye-slash' : 'bi bi-eye';
      }
      return;
    }

    const colorButton = target.closest('.color-dot');
    if (colorButton) {
      colorButton.parentElement?.querySelector('.color-popover')?.classList.toggle('is-open');
      return;
    }

    const swatch = target.closest<HTMLElement>('[data-color-value]');
    if (swatch) this.selectColor(swatch);
  }

  @HostListener('change', ['$event'])
  handleChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches('[data-handle-option]')) {
      this.query<HTMLButtonElement>('[data-update-handle]').disabled = false;
    }
    if (target instanceof HTMLInputElement && target.id === 'avatarInput' && target.files?.[0]) {
      const url = URL.createObjectURL(target.files[0]);
      this.all<HTMLElement>('[data-edit-avatar], [data-hero-avatar], [data-chip-avatar]').forEach((avatar) => {
        avatar.innerHTML = `<img src="${url}" alt="Profile avatar">`;
      });
    }
  }

  @HostListener('submit', ['$event'])
  handleSubmit(event: SubmitEvent): void {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-password-form]')) return;
    event.preventDefault();
    const current = form.querySelector<HTMLInputElement>('#profileCurrentPassword')?.value ?? '';
    const next = form.querySelector<HTMLInputElement>('#profileNewPassword')?.value ?? '';
    const confirm = form.querySelector<HTMLInputElement>('#profileConfirmPassword')?.value ?? '';
    this.setText('#profileCurrentPasswordError', current ? '' : 'Enter your current password.');
    this.setText('#profileNewPasswordError', next.length >= 8 ? '' : 'Use at least 8 characters.');
    this.setText('#profileConfirmPasswordError', confirm === next ? '' : 'Passwords do not match.');
    if (!current || next.length < 8 || confirm !== next) return;
    this.setText('#profileGlobalMessage', 'Password updated successfully.');
    form.reset();
  }

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches('[data-password-field]')) {
      const form = target.closest('form');
      const current = form?.querySelector<HTMLInputElement>('#profileCurrentPassword')?.value ?? '';
      const next = form?.querySelector<HTMLInputElement>('#profileNewPassword')?.value ?? '';
      const confirm = form?.querySelector<HTMLInputElement>('#profileConfirmPassword')?.value ?? '';
      const submit = form?.querySelector<HTMLButtonElement>('[data-submit-password]');
      if (submit) submit.disabled = !current || next.length < 8 || confirm !== next;
    }
  }

  private showEditor(editing: boolean): void {
    this.query('[data-profile-view]').classList.toggle('is-active', !editing);
    this.query('[data-profile-edit]').classList.toggle('is-active', editing);
  }

  private saveProfile(): void {
    const user = {
      ...this.readUser(),
      displayName: this.input('#displayName').value.trim() || 'Alone',
      handle: this.input('#username').value.trim() || '@alone254544',
      bio: this.textarea('#bio').value.trim(),
    };
    localStorage.setItem('lingoraCurrentUser', JSON.stringify(user));
    this.renderProfile(user);
    this.showEditor(false);
  }

  private updateHandle(): void {
    const selected = this.query<HTMLInputElement>('[data-handle-option]:checked').value;
    const raw = selected === 'custom'
      ? this.query<HTMLInputElement>('[data-handle-custom]').value.trim()
      : this.query<HTMLElement>(selected === 'suggested' ? '[data-handle-suggested]' : '[data-handle-current]').textContent?.trim() ?? '';
    const handle = raw.startsWith('@') ? raw : `@${raw}`;
    if (handle.length < 3) {
      this.setText('[data-handle-warning]', 'Enter a valid handle.');
      return;
    }
    this.input('#username').value = handle;
    this.setHidden('[data-handle-modal]', true);
  }

  private selectColor(swatch: HTMLElement): void {
    const picker = swatch.closest<HTMLElement>('[data-color-picker]');
    const color = swatch.dataset['colorValue'] ?? '';
    if (!picker) return;
    picker.querySelectorAll('.color-swatch').forEach((item) => item.classList.toggle('is-selected', item === swatch));
    const text = picker.querySelector<HTMLElement>('span[id$="ColorText"]');
    if (text) text.textContent = color || 'None';
    const button = picker.querySelector<HTMLElement>('.color-dot');
    if (button) button.style.backgroundColor = color || 'transparent';
    document.documentElement.style.setProperty(picker.dataset['colorPicker'] === 'accent' ? '--profile-accent' : '--profile-background', color || 'transparent');
    picker.querySelector('.color-popover')?.classList.remove('is-open');
  }

  private renderProfile(user: { displayName: string; handle: string; bio: string }): void {
    this.all<HTMLElement>('[data-view-name]').forEach((element) => element.textContent = user.displayName);
    this.setText('[data-view-handle]', user.handle);
    this.setText('[data-view-bio]', user.bio || 'No game no life');
    this.all<HTMLElement>('[data-edit-avatar] span, [data-hero-avatar] span, [data-chip-avatar] span')
      .forEach((element) => element.textContent = user.displayName.charAt(0).toUpperCase());
  }

  private readUser(): { displayName: string; handle: string; bio: string; [key: string]: unknown } {
    try {
      const saved = JSON.parse(localStorage.getItem('lingoraCurrentUser') ?? '{}') as Record<string, unknown>;
      return {
        ...saved,
        displayName: String(saved['displayName'] || 'Alone'),
        handle: String(saved['handle'] || '@alone254544'),
        bio: String(saved['bio'] || 'No game no life'),
      };
    } catch {
      return { displayName: 'Alone', handle: '@alone254544', bio: 'No game no life' };
    }
  }

  private setHidden(selector: string, hidden: boolean): void { this.query<HTMLElement>(selector).hidden = hidden; }
  private toggle(selector: string): void { const element = this.query<HTMLElement>(selector); element.hidden = !element.hidden; }
  private setText(selector: string, value: string): void { this.query<HTMLElement>(selector).textContent = value; }
  private input(selector: string): HTMLInputElement { return this.query<HTMLInputElement>(selector); }
  private textarea(selector: string): HTMLTextAreaElement { return this.query<HTMLTextAreaElement>(selector); }
  private query<T extends Element = HTMLElement>(selector: string): T { return this.host.nativeElement.querySelector<T>(selector)!; }
  private all<T extends Element = HTMLElement>(selector: string): T[] { return Array.from(this.host.nativeElement.querySelectorAll<T>(selector)); }
}
