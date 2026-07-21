import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiCollectionResponse,
  ApiItemResponse,
  AuthorPost,
  CreatePostPayload,
  PostListParams,
  UpdatePostPayload,
} from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly authorHeaders = new HttpHeaders({ 'x-user-id': '1' });

  listAuthorPosts(params: PostListParams = {}): Observable<ApiCollectionResponse<AuthorPost>> {
    return this.http.get<ApiCollectionResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, {
      headers: this.authorHeaders,
      params: this.toHttpParams(params),
    });
  }

  getAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.http
      .get<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts/${postId}`, {
        headers: this.authorHeaders,
      })
      .pipe(map((response) => response.data));
  }

  createAuthorPost(payload: CreatePostPayload): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, payload, {
        headers: this.authorHeaders,
      })
      .pipe(map((response) => response.data));
  }

  updateAuthorPost(postId: string | number, payload: UpdatePostPayload): Observable<AuthorPost> {
    return this.http
      .patch<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts/${postId}`, payload, {
        headers: this.authorHeaders,
      })
      .pipe(map((response) => response.data));
  }

  submitAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'submit');
  }

  archiveAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'archive');
  }

  restoreAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'restore');
  }

  trashAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'trash');
  }

  restoreAuthorPostFromTrash(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'restore-trash');
  }

  private authorPostAction(postId: string | number, action: string): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts/${postId}/${action}`, null, {
        headers: this.authorHeaders,
      })
      .pipe(map((response) => response.data));
  }

  private toHttpParams(params: PostListParams): HttpParams {
    return Object.entries(params).reduce((httpParams, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return httpParams;
      }

      return httpParams.set(key, String(value));
    }, new HttpParams());
  }
}
