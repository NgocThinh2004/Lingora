import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  passwordVisible = false;
  emailError = '';
  passwordError = '';
  alert = '';

  ngOnInit(): void {
    this.ui.mount('Log in - Lingora', 'auth-body');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  login(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const email = form.querySelector<HTMLInputElement>('#loginEmail')?.value.trim() ?? '';
    const password = form.querySelector<HTMLInputElement>('#loginPassword')?.value ?? '';

    this.emailError = /^\S+@\S+\.\S+$/.test(email) ? '' : 'Please enter a valid email address.';
    this.passwordError = password.length >= 8 ? '' : 'Password must contain at least 8 characters.';
    this.alert = this.emailError || this.passwordError ? 'Please check the highlighted fields.' : '';
    if (this.alert) return;

    localStorage.setItem('lingoraCurrentUser', JSON.stringify({
      email,
      displayName: email.split('@')[0],
      role: 'user',
    }));
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    void this.router.navigateByUrl(redirect?.startsWith('/') ? redirect : '/home');
  }
}
