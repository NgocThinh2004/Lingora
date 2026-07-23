import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse, PublicPost } from '../../features/posts/models/post.model';

export interface SubscriptionAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface SubscriptionData {
  authors: SubscriptionAuthor[];
  posts: PublicPost[];
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

  unsubscribe(authorId: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${authorId}`);
  }
}
