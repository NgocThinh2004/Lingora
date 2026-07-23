import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { User } from '../models/user.model';

export interface SubscriptionEntry {
  id: number;
  subscriber?: User;
  author?: User;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private readonly http: HttpClient) {}

  toggle(authorId: number): Observable<{ subscribed: boolean }> {
    return this.http
      .post<ApiResponse<{ subscribed: boolean }>>(
        `${environment.apiUrl}/users/${authorId}/subscribe`,
        {},
      )
      .pipe(map((res) => res.data));
  }

  followers(userId: number): Observable<SubscriptionEntry[]> {
    return this.http
      .get<ApiResponse<SubscriptionEntry[]>>(`${environment.apiUrl}/users/${userId}/followers`)
      .pipe(map((res) => res.data));
  }

  following(userId: number): Observable<SubscriptionEntry[]> {
    return this.http
      .get<ApiResponse<SubscriptionEntry[]>>(`${environment.apiUrl}/users/${userId}/following`)
      .pipe(map((res) => res.data));
  }
}
