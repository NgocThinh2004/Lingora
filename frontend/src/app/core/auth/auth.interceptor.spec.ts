import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('refreshes once after 401 and retries with the new access token', () => {
    localStorage.setItem('access_token', 'expired-access');
    localStorage.setItem('refresh_token', 'old-refresh');

    let response: unknown;
    http.get(`${environment.apiUrl}/protected`).subscribe(value => response = value);

    const failedRequest = httpTesting.expectOne(`${environment.apiUrl}/protected`);
    expect(failedRequest.request.headers.get('Authorization')).toBe('Bearer expired-access');
    failedRequest.flush(null, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpTesting.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(refreshRequest.request.headers.has('Authorization')).toBeFalse();
    refreshRequest.flush({
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: {
          id: '1',
          email: 'member@example.com',
          username: 'member',
          displayName: 'Member',
          role: 'member',
        },
      },
    });

    const retriedRequest = httpTesting.expectOne(`${environment.apiUrl}/protected`);
    expect(retriedRequest.request.headers.get('Authorization')).toBe('Bearer new-access');
    retriedRequest.flush({ ok: true });

    expect(response).toEqual({ ok: true });
  });
});
