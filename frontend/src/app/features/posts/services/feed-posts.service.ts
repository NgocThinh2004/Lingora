import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginatedResult, Post } from '../models/post.model';
import { ApiResponse } from '../../../core/http/api-response.model';

export interface PostQuery {
  lang?: string;
  category?: string;
  q?: string;
  authorId?: string | number;
  sort?: 'top' | 'newest';
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class FeedPostsService {
  private readonly baseUrl = `${environment.apiUrl}/posts`;

  constructor(private readonly http: HttpClient) {}

  list(query: PostQuery = {}): Observable<PaginatedResult<Post>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<ApiResponse<PaginatedResult<Post>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  getById(id: number): Observable<Post> {
    return this.http
      .get<ApiResponse<Post>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

}
