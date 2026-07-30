import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../models/user.model';
import { ApiResponse } from '../../../core/http/api-response.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  getPublicProfile(id: number): Observable<User> {
    return this.http
      .get<ApiResponse<User>>(`${environment.apiUrl}/users/${id}`)
      .pipe(map((res) => res.data));
  }

  getRecommended(q?: string, limit?: number): Observable<User[]> {
    let params = new HttpParams();
    if (q) {
      params = params.set('q', q);
    }
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return this.http
      .get<ApiResponse<User[]>>(`${environment.apiUrl}/users/recommended`, { params })
      .pipe(map((res) => res.data));
  }

  getFollowers(id: number): Observable<User[]> {
    return this.http
      .get<ApiResponse<User[]>>(`${environment.apiUrl}/users/${id}/followers`)
      .pipe(map((res) => res.data));
  }

  getFollowing(id: number): Observable<User[]> {
    return this.http
      .get<ApiResponse<User[]>>(`${environment.apiUrl}/users/${id}/following`)
      .pipe(map((res) => res.data));
  }

  updateMe(payload: Partial<User>): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${environment.apiUrl}/users/me`, payload)
      .pipe(map((res) => res.data));
  }
}
