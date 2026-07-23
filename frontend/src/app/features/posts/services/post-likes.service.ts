import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';

export interface LikeStatus {
  liked: boolean;
  likeCount: number;
}

@Injectable({ providedIn: 'root' })
export class PostLikesService {
  constructor(private readonly http: HttpClient) {}

  getStatus(postId: number, userId?: number): Observable<LikeStatus> {
    const url = `${environment.apiUrl}/posts/${postId}/likes${userId ? `?userId=${userId}` : ''}`;
    return this.http.get<ApiResponse<LikeStatus>>(url).pipe(map((res) => res.data));
  }

  toggle(postId: number): Observable<LikeStatus> {
    return this.http
      .post<ApiResponse<LikeStatus>>(`${environment.apiUrl}/posts/${postId}/likes/toggle`, {})
      .pipe(map((res) => res.data));
  }
}
