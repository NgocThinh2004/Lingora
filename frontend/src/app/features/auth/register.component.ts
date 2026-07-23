import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);
  private readonly router = inject(Router);

  passwordVisible = false;
  confirmPasswordVisible = false;
  nameError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';
  alert = '';

  ngOnInit(): void {
    this.ui.mount('Create account - Lingora', 'auth-body');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  register(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const value = (id: string) => form.querySelector<HTMLInputElement>(`#${id}`)?.value.trim() ?? '';
    const name = value('regName');
    const email = value('regEmail');
    const password = value('regPassword');
    const confirmPassword = value('regConfirmPassword');

    this.nameError = name.length >= 2 ? '' : 'Full name must contain at least 2 characters.';
    this.emailError = /^\S+@\S+\.\S+$/.test(email) ? '' : 'Please enter a valid email address.';
    this.passwordError = password.length >= 8 ? '' : 'Password must contain at least 8 characters.';
    this.confirmPasswordError = confirmPassword === password ? '' : 'Passwords do not match.';
    this.alert = this.nameError || this.emailError || this.passwordError || this.confirmPasswordError
      ? 'Please check the highlighted fields.'
      : '';
    if (this.alert) return;

    localStorage.setItem('lingoraCurrentUser', JSON.stringify({ displayName: name, email, role: 'user' }));
    void this.router.navigateByUrl('/home');
  }
}
