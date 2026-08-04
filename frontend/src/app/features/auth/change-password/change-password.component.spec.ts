import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let component: ChangePasswordComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'changePassword',
      'expireSession',
    ]);
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('rejects a confirmation password that does not match', () => {
    component.form.setValue({
      currentPassword: 'current-password',
      newPassword: 'New-password1!',
      confirmPassword: 'different-password',
    });

    expect(component.form.hasError('mismatch')).toBeTrue();
  });

  it('changes the password, expires the session, and returns to login', () => {
    authService.changePassword.and.returnValue(of({ message: 'Password updated' }));
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    component.form.setValue({
      currentPassword: 'current-password',
      newPassword: 'New-password1!',
      confirmPassword: 'New-password1!',
    });

    component.changePassword();

    expect(authService.changePassword).toHaveBeenCalledOnceWith({
      currentPassword: 'current-password',
      newPassword: 'New-password1!',
    });
    expect(authService.expireSession).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { messageKey: 'password_updated_sign_in_again' },
    });
  });
});
