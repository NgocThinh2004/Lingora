import { HttpClient } from '@angular/common/http';
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

  getRecommended(): Observable<User[]> {
    return this.http
      .get<ApiResponse<User[]>>(`${environment.apiUrl}/users/recommended`)
      .pipe(map((res) => res.data));
  }

  updateMe(payload: Partial<User>): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${environment.apiUrl}/users/me`, payload)
      .pipe(map((res) => res.data));
  }
}
