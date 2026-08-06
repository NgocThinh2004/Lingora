import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { ApiResponse } from '../http/api-response.model';
import {
  AuthMessage,
  AuthSession,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './auth.model';
import { CurrentUser } from './current-user.model';

import { BrandingService } from '../theme/branding.service';

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

  constructor(
    private http: HttpClient,
    private brandingService: BrandingService,
  ) {
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<AuthSession> {
    return this.http.post<ApiResponse<AuthSession>>(`${this.apiUrl}/login`, credentials)
      .pipe(
        map(response => response.data),
        tap(session => {
          if (session?.accessToken && session.refreshToken) {
            this.setSession(session);
          }
        })
      );
  }

  register(userData: RegisterRequest): Observable<CurrentUser> {
    return this.http.post<ApiResponse<CurrentUser>>(`${this.apiUrl}/register`, userData).pipe(
      map(response => response.data),
    );
  }

  forgotPassword(email: string): Observable<AuthMessage> {
    const payload: ForgotPasswordRequest = { email };

    return this.http.post<ApiResponse<AuthMessage>>(
      `${this.apiUrl}/forgot-password`,
      payload,
    ).pipe(map(response => response.data));
  }

  resetPassword(payload: ResetPasswordRequest): Observable<AuthMessage> {
    return this.http.post<ApiResponse<AuthMessage>>(
      `${this.apiUrl}/reset-password`,
      payload,
    ).pipe(
      map(response => response.data),
      tap(() => this.clearSession())
    );
  }

  getMe(): Observable<CurrentUser> {
    return this.http.get<ApiResponse<CurrentUser>>(`${this.apiUrl}/me`).pipe(
      map(response => response.data),
      tap(user => this.storeCurrentUser(user)),
    );
  }

  updateProfile(payload: {
    displayName: string;
    username: string;
    bio: string;
    avatarMediaId?: string;
    accentColor?: string;
    backgroundColor?: string;
  }): Observable<CurrentUser> {
    return this.http.patch<ApiResponse<CurrentUser>>(`${this.apiUrl}/me`, payload).pipe(
      map(response => response.data),
      tap(user => this.storeCurrentUser(user)),
    );
  }

  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http
      .post<ApiResponse<{ message: string }>>(`${this.apiUrl}/change-password`, payload)
      .pipe(map(response => response.data));
  }

  refreshSession(): Observable<AuthSession> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token is available'));
    }

    if (!this.refreshRequest$) {
      const payload: RefreshTokenRequest = { refreshToken };

      this.refreshRequest$ = this.http
        .post<ApiResponse<AuthSession>>(`${this.apiUrl}/refresh`, payload)
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
    const payload: RefreshTokenRequest | null = refreshToken ? { refreshToken } : null;
    const request$: Observable<unknown> = refreshToken
      ? this.http.post<unknown>(`${this.apiUrl}/logout`, payload)
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
      this.storeCurrentUser(authResult.user);
    }
  }

  private storeCurrentUser(user: CurrentUser): void {
    localStorage.setItem(this.userInfoKey, JSON.stringify(user));
    this.currentUserSignal.set(user);
    if (user.accentColor) {
      this.brandingService.setAccent(user.accentColor, true);
    } else {
      this.brandingService.resetToDefault();
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userInfoKey);
    this.currentUserSignal.set(null);
    this.brandingService.resetToDefault();
  }

  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem(this.userInfoKey);
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as CurrentUser;
        this.currentUserSignal.set(user);
        if (user.accentColor) {
          this.brandingService.setAccent(user.accentColor, true);
        } else {
          this.brandingService.resetToDefault();
        }
      } catch {
        this.clearSession();
      }
    } else {
      this.brandingService.resetToDefault();
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() || !!this.currentUser();
  }

  getToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }
}
