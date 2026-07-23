import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthLayoutComponent } from '../../../shared/layouts/auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: '../password-recovery.scss',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);

  readonly forgotPasswordForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isSubmitting = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  onSubmit(): void {
    const emailControl = this.forgotPasswordForm.controls.email;
    const email = emailControl.value.trim().toLowerCase();
    emailControl.setValue(email);

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        sessionStorage.setItem('password_reset_email', email);
        sessionStorage.setItem('password_reset_sent_at', Date.now().toString());
        void this.router.navigate(['/auth/reset-password']);
      },
      error: error => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.meta?.error?.message
          || 'We could not process your request. Please try again.';
      },
    });
  }
}
