import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiCollectionResponse,
  ApiItemResponse,
  AuthorPost,
  CreatePostPayload,
  PostListParams,
  PostOptions,
  UpdatePostPayload,
} from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class AuthorPostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listAuthorPosts(params: PostListParams = {}): Observable<ApiCollectionResponse<AuthorPost>> {
    return this.http.get<ApiCollectionResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, {
      params: this.toHttpParams(params),
    });
  }

  getPostOptions(): Observable<PostOptions> {
    return this.http
      .get<ApiItemResponse<PostOptions | ApiItemResponse<PostOptions>>>(`${this.baseUrl}/posts/options`)
      .pipe(map(response => this.unwrapItem(response)));
  }

  getAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.http
      .get<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(`${this.baseUrl}/author/posts/${postId}`)
      .pipe(map(response => this.unwrapItem(response)));
  }

  createAuthorPost(payload: CreatePostPayload): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(`${this.baseUrl}/author/posts`, payload)
      .pipe(map(response => this.unwrapItem(response)));
  }

  updateAuthorPost(postId: string | number, payload: UpdatePostPayload): Observable<AuthorPost> {
    return this.http
      .patch<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(
        `${this.baseUrl}/author/posts/${postId}`,
        payload,
      )
      .pipe(map(response => this.unwrapItem(response)));
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

  deleteAuthorPostPermanently(postId: string | number): Observable<void> {
    return this.http
      .delete<ApiItemResponse<{ id: string }>>(`${this.baseUrl}/author/posts/${postId}`)
      .pipe(map(() => undefined));
  }

  private authorPostAction(postId: string | number, action: string): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(
        `${this.baseUrl}/author/posts/${postId}/${action}`,
        null,
      )
      .pipe(map(response => this.unwrapItem(response)));
  }

  private unwrapItem<T>(response: ApiItemResponse<T | ApiItemResponse<T>>): T {
    const value = response.data;
    if (value && typeof value === 'object' && 'data' in value) {
      return value.data;
    }

    return value as T;
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
