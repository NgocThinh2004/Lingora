import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthLayoutComponent } from '../../../shared/layouts/auth-layout/auth-layout.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  togglePasswordVisibility(field: 'password' | 'confirm') {
    if (field === 'password') this.showPassword = !this.showPassword;
    if (field === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { confirmPassword, ...payload } = this.registerForm.getRawValue();
    this.authService.register(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        // On successful registration, redirect to login page with a success query param
        this.router.navigate(['/auth/login'], { queryParams: { registered: 'true' } });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.meta?.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
