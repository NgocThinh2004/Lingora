import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiItemResponse } from '../../../core/http/api-response.model';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionAuthor, SubscriptionData } from '../models/subscription.model';

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

  list(lang?: string): Observable<SubscriptionData> {
    const params = lang ? new HttpParams().set('lang', lang) : undefined;
    return this.http.get<ApiItemResponse<SubscriptionData>>(this.baseUrl, { params })
      .pipe(map(response => response.data));
  }


  following(): Observable<SubscriptionAuthor[]> {
    return this.http
      .get<ApiItemResponse<SubscriptionAuthor[]>>(`${this.baseUrl}/following`)
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
