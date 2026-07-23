import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PaginatedResult } from '../models/post.model';
import { Comment } from '../models/comment.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private readonly http = inject(HttpClient);

  private mapComment(comment: any): Comment {
    return {
      ...comment,
      author: {
        id: comment.author.id,
        name: comment.author.display_name || comment.author.username || 'User',
        handle: comment.author.username || 'user',
        avatarUrl: comment.author.avatar,
        role: comment.author.role_id === 1 ? 'admin' : 'member',
        allowShowSubscribers: true,
        allowShowFollowing: true
      },
      replies: comment.replies ? comment.replies.map((r: any) => this.mapComment(r)) : []
    };
  }

  getCommentsByPost(postId: string, page: number = 1, limit: number = 20): Observable<PaginatedResult<Comment>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments`, { params })
      .pipe(map((res) => {
        const data = res.data;
        return {
          items: data.items.map((c: any) => this.mapComment(c)),
          meta: {
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages
          }
        };
      }));
  }

  createComment(postId: string, content: string, replyToCommentId?: string | number): Observable<Comment> {
    const payload: any = { content, languageCode: localStorage.getItem('lingora-locale') || 'en' };
    if (replyToCommentId !== undefined && replyToCommentId !== null) {
      payload.reply_to_comment_id = String(replyToCommentId);
    }
    return this.http
      .post<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments`, payload)
      .pipe(map((res) => this.mapComment(res.data)));
  }

  updateComment(postId: string, commentId: string, content: string): Observable<Comment> {
    return this.http
      .put<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments/${commentId}`, { content })
      .pipe(map((res) => this.mapComment(res.data)));
  }

  deleteComment(postId: string, commentId: string): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments/${commentId}`)
      .pipe(map((res) => res.data));
  }

  translateComment(postId: string, commentId: string, languageCode: string): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${environment.apiUrl}/posts/${postId}/comments/${commentId}/translate`, { languageCode })
      .pipe(map((res) => res.data));
  }
}
