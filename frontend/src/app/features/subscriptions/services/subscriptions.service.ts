import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, Subject, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiItemResponse, Post } from '../../posts/models/post.model';
import { AuthService } from '../../../core/auth/auth.service';

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
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/subscriptions`;

  private followedAuthorIds = new BehaviorSubject<Set<string>>(new Set());
  private initialized = false;

  private subscriptionChangedSource = new Subject<{ authorId: string, subscribed: boolean }>();
  subscriptionChanged$ = this.subscriptionChangedSource.asObservable();

  initFollowingState(): void {
    if (!this.authService.isAuthenticated()) return;
    this.initialized = true;
    this.following().subscribe({
      next: (authors) => {
        this.followedAuthorIds.next(new Set(authors.map(a => String(a.id))));
      },
      error: () => { this.initialized = false; }
    });
  }

  isFollowingState(authorId: string | number): Observable<boolean> {
    if (!this.initialized && this.authService.isAuthenticated()) {
      this.initFollowingState();
    }
    return this.followedAuthorIds.asObservable().pipe(map(set => set.has(String(authorId))));
  }

  list(): Observable<SubscriptionData> {
    return this.http.get<ApiItemResponse<SubscriptionData>>(this.baseUrl).pipe(map(response => response.data));
  }

  stats(): Observable<{ followers: number; following: number }> {
    return this.http
      .get<ApiItemResponse<{ followers: number; following: number }>>(`${this.baseUrl}/stats`)
      .pipe(map(response => response.data));
  }

  followers(): Observable<SubscriptionAuthor[]> {
    return this.http
      .get<ApiItemResponse<SubscriptionAuthor[]>>(`${this.baseUrl}/followers`)
      .pipe(map(response => response.data));
  }

  following(): Observable<SubscriptionAuthor[]> {
    return this.http
      .get<ApiItemResponse<SubscriptionAuthor[]>>(`${this.baseUrl}/following`)
      .pipe(map(response => response.data));
  }

  unsubscribe(authorId: string | number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${authorId}`).pipe(
      tap(() => {
        const set = new Set(this.followedAuthorIds.value);
        set.delete(String(authorId));
        this.followedAuthorIds.next(set);
        this.subscriptionChangedSource.next({ authorId: String(authorId), subscribed: false });
      })
    );
  }

  subscribe(authorId: string | number): Observable<{ authorId: string; subscribed: boolean }> {
    return this.http.post<ApiItemResponse<{ authorId: string; subscribed: boolean }>>(`${this.baseUrl}/${authorId}`, {}).pipe(
      map(res => res.data),
      tap(() => {
        const set = new Set(this.followedAuthorIds.value);
        set.add(String(authorId));
        this.followedAuthorIds.next(set);
        this.subscriptionChangedSource.next({ authorId: String(authorId), subscribed: true });
      })
    );
  }

  checkSubscription(authorId: string | number): Observable<{ subscribed: boolean }> {
    return this.http.get<ApiItemResponse<{ subscribed: boolean }>>(`${this.baseUrl}/check/${authorId}`).pipe(map(res => res.data));
  }
}
