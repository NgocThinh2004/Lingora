import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Comment } from '../models/comment.model';
import { ApiResponse } from '../../../core/http/api-response.model';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly baseUrl = `${environment.apiUrl}/comments`;

  constructor(private readonly http: HttpClient) {}

  findByPost(postId: number): Observable<Comment[]> {
    return this.http
      .get<ApiResponse<Comment[]>>(`${this.baseUrl}/post/${postId}`)
      .pipe(map((res) => res.data));
  }

  create(payload: { postId: number; parentId?: number; content: string }): Observable<Comment> {
    return this.http
      .post<ApiResponse<Comment>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }
}
