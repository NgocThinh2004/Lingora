import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentUser } from '../../../core/auth/current-user.model';
import { getApiErrorMessage } from '../../../core/http/api-error.util';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocaleService } from '../../../core/locale/locale.service';

export function resolvePostLoginUrl(user: CurrentUser, returnUrl: string | null): string {
  if (user.role === 'admin') {
    return '/admin';
  }

  return returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
    ? returnUrl
    : '/';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent, TranslatePipe],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;
  showPassword = false;
  errorMessage = '';
  returnUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private localeService: LocaleService,
  ) {
    this.loginForm = this.fb.group({
      emailOrUsername: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.toastService.showSuccess(this.localeService.translate('registration_success_login'));
      }
      if (params['passwordReset'] === 'true') {
        this.toastService.showSuccess(this.localeService.translate('password_reset_success_login'));
      }
      if (typeof params['messageKey'] === 'string' && params['messageKey']) {
        this.toastService.showSuccess(this.localeService.translate(params['messageKey']));
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).pipe(
      finalize(() => this.isSubmitting = false),
    ).subscribe({
      next: response => {
        this.toastService.showSuccess(this.localeService.translate('logged_in_success'));
        void this.router.navigateByUrl(resolvePostLoginUrl(response.data.user, this.returnUrl));
      },
      error: error => {
        this.errorMessage = getApiErrorMessage(error, this.localeService.translate('login_failed'), true);
      }
    });
  }
}
