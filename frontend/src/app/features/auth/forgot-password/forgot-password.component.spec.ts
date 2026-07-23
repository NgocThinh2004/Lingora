import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  it('stores the normalized email and opens the reset page after requesting a code', () => {
    spyOn(router, 'navigate').and.resolveTo(true);
    authService.forgotPassword.and.returnValue(of({ data: { message: 'Request accepted' } }));
    component.forgotPasswordForm.setValue({ email: ' Member@Example.COM ' });

    component.onSubmit();

    expect(authService.forgotPassword).toHaveBeenCalledWith('member@example.com');
    expect(sessionStorage.getItem('password_reset_email')).toBe('member@example.com');
    expect(router.navigate).toHaveBeenCalledWith(['/auth/reset-password']);
  });
});
