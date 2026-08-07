import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import { AdminPost, AdminPostsQuery, ReviewAdminPostRequest } from '../models/admin-post.model';

@Injectable({ providedIn: 'root' })
export class AdminPostsService {
  private readonly apiUrl = `${environment.apiUrl}/admin/posts`;

  constructor(private readonly http: HttpClient) {}

  getPosts(query: AdminPostsQuery): Observable<ApiResponse<AdminPost[]>> {
    let params = new HttpParams()
      .set('search', query.search)
      .set('status', query.status)
      .set('language', query.language)
      .set('page', query.page)
      .set('limit', query.limit);
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    return this.http.get<ApiResponse<AdminPost[]>>(this.apiUrl, { params });
  }

  getPost(postId: string, language: string, localized = false): Observable<ApiResponse<AdminPost>> {
    let params = new HttpParams().set('language', language);
    if (localized) params = params.set('localized', 'true');
    return this.http.get<ApiResponse<AdminPost>>(`${this.apiUrl}/${postId}`, { params });
  }

  reviewPost(postId: string, payload: ReviewAdminPostRequest, language: string): Observable<ApiResponse<AdminPost>> {
    const params = new HttpParams().set('language', language);
    return this.http.patch<ApiResponse<AdminPost>>(`${this.apiUrl}/${postId}/review`, payload, { params });
  }
}
