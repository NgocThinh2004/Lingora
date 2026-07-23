import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../models/user.model';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface SubscriptionToggleResponse {
  subscribed: boolean;
  subscriberCount?: number;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly baseUrl = `${environment.apiUrl}/subscriptions`;

  constructor(private readonly http: HttpClient) {}

  toggle(authorId: number): Observable<SubscriptionToggleResponse> {
    return this.http
      .post<ApiResponse<SubscriptionToggleResponse>>(
        `${this.baseUrl}/${authorId}/toggle`,
        {}
      )
      .pipe(map((res) => res.data));
  }

  getFollowing(): Observable<User[]> {
    return this.http
      .get<ApiResponse<User[]>>(`${this.baseUrl}/following`)
      .pipe(map((res) => res.data));
  }
}
