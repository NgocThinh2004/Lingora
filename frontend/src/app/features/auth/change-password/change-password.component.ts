
import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { PageShellService } from '../../../core/ui/page-shell.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChangePasswordComponent implements OnInit, OnDestroy {
  private readonly ui = inject(PageShellService);

  currentVisible = false;
  newVisible = false;
  confirmVisible = false;
  currentError = '';
  newError = '';
  confirmError = '';
  message = '';
  formValid = false;

  ngOnInit(): void {
    this.ui.mount('Change password - Lingora');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  validate(event: Event): void {
    const form = event.currentTarget as HTMLFormElement;
    const values = this.values(form);
    this.formValid = values.current.length > 0 && values.next.length >= 8 && values.confirm === values.next;
    this.message = '';
  }

  changePassword(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const values = this.values(form);
    this.currentError = values.current ? '' : 'Enter your current password.';
    this.newError = values.next.length >= 8 ? '' : 'Use at least 8 characters.';
    this.confirmError = values.confirm === values.next ? '' : 'Passwords do not match.';
    if (this.currentError || this.newError || this.confirmError) return;

    this.message = 'Password updated successfully.';
    form.reset();
    this.formValid = false;
  }

  private values(form: HTMLFormElement): { current: string; next: string; confirm: string } {
    return {
      current: form.querySelector<HTMLInputElement>('#currentPassword')?.value ?? '',
      next: form.querySelector<HTMLInputElement>('#newPassword')?.value ?? '',
      confirm: form.querySelector<HTMLInputElement>('#confirmPassword')?.value ?? '',
    };
  }
}
