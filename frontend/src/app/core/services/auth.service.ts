import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { AuthSession, CurrentUser } from '../models/current-user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly userInfoKey = 'user_info';
  private refreshRequest$?: Observable<AuthSession>;
  
  private readonly currentUserSignal: WritableSignal<CurrentUser | null> = signal(null);
  readonly currentUser = this.currentUserSignal.asReadonly();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  login(credentials: { emailOrUsername: string; password: string }): Observable<ApiResponse<AuthSession>> {
    return this.http.post<ApiResponse<AuthSession>>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.data?.accessToken && response.data.refreshToken) {
            this.setSession(response.data);
          }
        })
      );
  }

  register(userData: { fullName: string; email: string; password: string }): Observable<ApiResponse<CurrentUser>> {
    return this.http.post<ApiResponse<CurrentUser>>(`${this.apiUrl}/register`, userData);
  }

  refreshSession(): Observable<AuthSession> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token is available'));
    }

    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http
        .post<ApiResponse<AuthSession>>(`${this.apiUrl}/refresh`, { refreshToken })
        .pipe(
          map(response => response.data),
          tap(session => this.setSession(session)),
          finalize(() => {
            this.refreshRequest$ = undefined;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.refreshRequest$;
  }

  logout(): Observable<void> {
    const refreshToken = this.getRefreshToken();
    const request$: Observable<unknown> = refreshToken
      ? this.http.post<unknown>(`${this.apiUrl}/logout`, { refreshToken })
      : of(null);

    return request$.pipe(
      // Local logout must still succeed if the server/session is unavailable.
      catchError(() => of(null)),
      finalize(() => this.clearSession()),
      map((): void => undefined),
    );
  }

  logoutAll(): Observable<void> {
    return this.http.post(`${this.apiUrl}/logout-all`, {}).pipe(
      finalize(() => this.clearSession()),
      map((): void => undefined),
    );
  }

  expireSession(): void {
    this.clearSession();
  }

  private setSession(authResult: AuthSession): void {
    localStorage.setItem(this.accessTokenKey, authResult.accessToken);
    if (authResult.refreshToken) {
      localStorage.setItem(this.refreshTokenKey, authResult.refreshToken);
    }
    if (authResult.user) {
      localStorage.setItem(this.userInfoKey, JSON.stringify(authResult.user));
      this.currentUserSignal.set(authResult.user);
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userInfoKey);
    this.currentUserSignal.set(null);
  }

  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem(this.userInfoKey);
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as CurrentUser;
        this.currentUserSignal.set(user);
      } catch {
        this.clearSession();
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }
}
