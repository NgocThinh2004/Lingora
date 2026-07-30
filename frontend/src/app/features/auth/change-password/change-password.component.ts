import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { getApiErrorMessage } from '../../../core/http/api-error.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocaleService } from '../../../core/locale/locale.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly localeService = inject(LocaleService);

  readonly form = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordsMatch },
  );

  currentVisible = false;
  newVisible = false;
  confirmVisible = false;
  isSubmitting = false;
  errorMessage = '';

  changePassword(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    const { currentPassword, newPassword } = this.form.getRawValue();

    this.authService.changePassword({ currentPassword, newPassword }).pipe(
      finalize(() => this.isSubmitting = false),
    ).subscribe({
      next: () => {
        this.authService.expireSession();
        void this.router.navigate(['/auth/login'], {
          queryParams: { messageKey: 'password_updated_sign_in_again' },
        });
      },
      error: error => {
        this.errorMessage = getApiErrorMessage(error, this.localeService.translate('password_update_failed'), true);
      },
    });
  }

  private passwordsMatch(control: AbstractControl): ValidationErrors | null {
    return control.get('newPassword')?.value === control.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }
}
