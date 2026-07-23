import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiItemResponse, Post } from '../../posts/models/post.model';

export interface SubscriptionAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface SubscriptionData {
  authors: SubscriptionAuthor[];
  posts: Post[];
}

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/subscriptions`;

  list(): Observable<SubscriptionData> {
    return this.http.get<ApiItemResponse<SubscriptionData>>(this.baseUrl).pipe(map(response => response.data));
  }

  stats(): Observable<{ followers: number; following: number }> {
    return this.http
      .get<ApiItemResponse<{ followers: number; following: number }>>(`${this.baseUrl}/stats`)
      .pipe(map(response => response.data));
  }

  unsubscribe(authorId: string | number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${authorId}`);
  }

  subscribe(authorId: string | number): Observable<{ authorId: string; subscribed: boolean }> {
    return this.http.post<ApiItemResponse<{ authorId: string; subscribed: boolean }>>(`${this.baseUrl}/${authorId}`, {}).pipe(map(res => res.data));
  }

  checkSubscription(authorId: string | number): Observable<{ subscribed: boolean }> {
    return this.http.get<ApiItemResponse<{ subscribed: boolean }>>(`${this.baseUrl}/check/${authorId}`).pipe(map(res => res.data));
  }
}
