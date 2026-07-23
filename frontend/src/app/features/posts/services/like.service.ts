import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';

export interface LikeToggleResponse {
  liked: boolean;
  likeCount: number;
}

@Injectable({ providedIn: 'root' })
export class LikeService {
  constructor(private readonly http: HttpClient) {}

  togglePostLike(postId: number): Observable<LikeToggleResponse> {
    return this.http
      .post<ApiResponse<LikeToggleResponse>>(
        `${environment.apiUrl}/posts/${postId}/like`,
        {}
      )
      .pipe(map((res) => res.data));
  }

  toggleCommentLike(postId: number, commentId: number): Observable<LikeToggleResponse> {
    return this.http
      .post<ApiResponse<LikeToggleResponse>>(
        `${environment.apiUrl}/posts/${postId}/comments/${commentId}/like`,
        {}
      )
      .pipe(map((res) => res.data));
  }
}
