import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../models/user.model';
import { ApiResponse } from '../../../core/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  getProfile(idOrHandle: string | number): Observable<User> {
    return this.http
      .get<ApiResponse<User>>(`${this.baseUrl}/${idOrHandle}`)
      .pipe(map((res) => res.data));
  }

  getRecommended(): Observable<User[]> {
    return this.http
      .get<ApiResponse<User[]>>(`${this.baseUrl}/recommended`)
      .pipe(map((res) => res.data));
  }

  updateProfile(payload: Partial<User>): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${this.baseUrl}/me`, payload)
      .pipe(map((res) => res.data));
  }
}
