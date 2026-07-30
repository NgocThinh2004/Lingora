import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiItemResponse } from '../../../core/http/api-response.model';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionAuthor, SubscriptionAuthorsPage } from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/subscriptions`;

  private followedAuthorIds = new BehaviorSubject<Set<string>>(new Set());
  private initialized = false;

  initFollowingState(): void {
    if (!this.authService.isAuthenticated()) return;
    this.initialized = true;
    this.following().subscribe({
      next: data => {
        this.followedAuthorIds.next(new Set(data.items.map(author => String(author.id))));
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

  getFeed(author?: string, lang?: string, page?: number, limit?: number): Observable<any> {
    let params = new HttpParams();
    if (author) params = params.set('author', author);
    if (lang) params = params.set('lang', lang);
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    return this.http.get<ApiItemResponse<any>>(`${this.baseUrl}/feed`, { params })
      .pipe(map(response => response.data));
  }

  following(q?: string, page?: number, limit?: number): Observable<SubscriptionAuthorsPage> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    return this.http
      .get<ApiItemResponse<SubscriptionAuthorsPage>>(`${this.baseUrl}/following`, { params })
      .pipe(map(response => response.data));
  }

  followers(): Observable<SubscriptionAuthor[]> {
    return this.http
      .get<ApiItemResponse<SubscriptionAuthor[]>>(`${this.baseUrl}/followers`)
      .pipe(map(response => response.data));
  }

  unsubscribe(authorId: string | number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${authorId}`).pipe(
      tap(() => {
        const set = new Set(this.followedAuthorIds.value);
        set.delete(String(authorId));
        this.followedAuthorIds.next(set);
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
      })
    );
  }

}
