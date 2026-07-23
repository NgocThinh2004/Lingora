import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  const session = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: '1',
      email: 'admin@example.com',
      username: 'admin',
      displayName: 'Administrator',
      role: 'admin' as const,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('persists the complete session after login', () => {
    service.login({
      emailOrUsername: 'admin@example.com',
      password: 'password123',
    }).subscribe();

    httpTesting.expectOne(`${environment.apiUrl}/auth/login`).flush({ data: session });

    expect(service.getToken()).toBe('access-token');
    expect(service.getRefreshToken()).toBe('refresh-token');
    expect(service.currentUser()?.role).toBe('admin');
  });

  it('shares one refresh request between concurrent subscribers', () => {
    localStorage.setItem('refresh_token', 'old-refresh-token');
    let firstAccessToken = '';
    let secondAccessToken = '';

    service.refreshSession().subscribe(result => firstAccessToken = result.accessToken);
    service.refreshSession().subscribe(result => secondAccessToken = result.accessToken);

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(request.request.body).toEqual({ refreshToken: 'old-refresh-token' });
    request.flush({ data: session });

    expect(firstAccessToken).toBe('access-token');
    expect(secondAccessToken).toBe('access-token');
    expect(service.getRefreshToken()).toBe('refresh-token');
  });

  it('requests a password reset code for the supplied email', () => {
    service.forgotPassword('member@example.com').subscribe(response => {
      expect(response.data.message).toBe('Request accepted');
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/forgot-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'member@example.com' });
    request.flush({ data: { message: 'Request accepted' } });
  });

  it('resets the password and clears an existing local session', () => {
    localStorage.setItem('access_token', 'access-token');
    localStorage.setItem('refresh_token', 'refresh-token');
    localStorage.setItem('user_info', JSON.stringify(session.user));

    service.resetPassword({
      email: 'member@example.com',
      otp: '123456',
      newPassword: 'new-password-123',
    }).subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/reset-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'member@example.com',
      otp: '123456',
      newPassword: 'new-password-123',
    });
    request.flush({ data: { message: 'Password reset successfully' } });

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('clears local state even when server logout fails', () => {
    localStorage.setItem('access_token', 'access-token');
    localStorage.setItem('refresh_token', 'refresh-token');
    localStorage.setItem('user_info', JSON.stringify(session.user));

    service.logout().subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/auth/logout`).flush(
      { message: 'offline' },
      { status: 503, statusText: 'Unavailable' },
    );

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
