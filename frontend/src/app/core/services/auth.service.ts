import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { AuthSession, CurrentUser } from '../models/current-user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  
  // State management
  private currentUserSignal: WritableSignal<CurrentUser | null> = signal(null);
  public currentUser = this.currentUserSignal.asReadonly();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  login(credentials: { emailOrUsername: string; password: string }): Observable<ApiResponse<AuthSession>> {
    return this.http.post<ApiResponse<AuthSession>>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.data && response.data.accessToken) {
            this.setSession(response.data);
          }
        })
      );
  }

  register(userData: { fullName: string; email: string; password: string }): Observable<ApiResponse<CurrentUser>> {
    return this.http.post<ApiResponse<CurrentUser>>(`${this.apiUrl}/register`, userData);
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    this.currentUserSignal.set(null);
  }

  private setSession(authResult: AuthSession): void {
    localStorage.setItem('access_token', authResult.accessToken);
    if (authResult.user) {
      localStorage.setItem('user_info', JSON.stringify(authResult.user));
      this.currentUserSignal.set(authResult.user);
    }
  }

  private loadUserFromStorage() {
    const userJson = localStorage.getItem('user_info');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSignal.set(user);
      } catch (e) {
        console.error('Error parsing user info from local storage', e);
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}
