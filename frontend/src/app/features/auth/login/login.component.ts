import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { getApiErrorMessage } from '../../../core/http/api-error.util';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthLayoutComponent } from '../../../layouts/auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
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
    private toastService: ToastService
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
        this.toastService.showSuccess('Registration successful! Please log in.');
      }
      if (params['passwordReset'] === 'true') {
        this.toastService.showSuccess('Password reset successfully. Sign in with your new password.');
      }
      if (typeof params['message'] === 'string' && params['message']) {
        this.toastService.showSuccess(params['message']);
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
        this.toastService.showSuccess('Logged in successfully!');
        const returnUrl = this.returnUrl;
        if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) {
          void this.router.navigateByUrl(returnUrl);
          return;
        }

        void this.router.navigate(response.data.user.role === 'admin' ? ['/admin'] : ['/']);
      },
      error: error => {
        this.errorMessage = getApiErrorMessage(error, 'Login failed. Invalid credentials.');
      }
    });
  }
}
