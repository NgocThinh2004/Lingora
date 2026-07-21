import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    sessionStorage.setItem('password_reset_email', 'member@example.com');
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword', 'resetPassword']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    fixture.destroy();
    sessionStorage.clear();
  });

  it('rejects mismatched passwords before calling the API', () => {
    component.resetPasswordForm.setValue({
      email: 'member@example.com',
      otp: '123456',
      newPassword: 'new-password-123',
      confirmPassword: 'different-password-123',
    });

    component.onSubmit();

    expect(component.resetPasswordForm.hasError('passwordMismatch')).toBeTrue();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('submits the OTP and new password, then returns to login', () => {
    spyOn(router, 'navigate').and.resolveTo(true);
    authService.resetPassword.and.returnValue(of({ data: { message: 'Password reset successfully' } }));
    component.resetPasswordForm.setValue({
      email: 'Member@Example.COM',
      otp: '123456',
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123',
    });

    component.onSubmit();

    expect(authService.resetPassword).toHaveBeenCalledWith({
      email: 'member@example.com',
      otp: '123456',
      newPassword: 'new-password-123',
    });
    expect(sessionStorage.getItem('password_reset_email')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { passwordReset: 'true' },
    });
  });
});
