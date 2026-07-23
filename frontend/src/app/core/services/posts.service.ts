import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiCollectionResponse,
  ApiItemResponse,
  AuthorPost,
  CreatePostPayload,
  PostListParams,
  PostOptions,
  Post,
  PublicPost,
  UpdatePostPayload,
} from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listAuthorPosts(params: PostListParams = {}): Observable<ApiCollectionResponse<AuthorPost>> {
    return this.http.get<ApiCollectionResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, {
      params: this.toHttpParams(params),
    });
  }

  listPublicPosts(params: Pick<PostListParams, 'search' | 'page' | 'limit'> = {}): Observable<ApiCollectionResponse<PublicPost>> {
    return this.http
      .get<ApiCollectionResponse<PublicPost> | ApiItemResponse<{ items: Post[]; meta: ApiCollectionResponse<PublicPost>['meta'] }>>(
        `${this.baseUrl}/posts`,
        { params: this.toHttpParams(params) },
      )
      .pipe(map((response): ApiCollectionResponse<PublicPost> => {
        if (Array.isArray(response.data)) {
          return response as ApiCollectionResponse<PublicPost>;
        }
        return {
          data: response.data.items.map(post => this.toLegacyPublicPost(post)),
          meta: response.data.meta,
        };
      }));
  }

  getPublicPost(postId: string | number): Observable<PublicPost> {
    return this.http
      .get<ApiItemResponse<PublicPost | Post>>(`${this.baseUrl}/posts/${postId}`)
      .pipe(map(response => this.isLegacyPublicPost(response.data)
        ? response.data
        : this.toLegacyPublicPost(response.data)));
  }

  getPostOptions(): Observable<PostOptions> {
    return this.http
      .get<ApiItemResponse<PostOptions>>(`${this.baseUrl}/posts/options`)
      .pipe(map(response => response.data));
  }

  getAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.http
      .get<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts/${postId}`)
      .pipe(map((response) => response.data));
  }

  createAuthorPost(payload: CreatePostPayload): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, payload)
      .pipe(map((response) => response.data));
  }

  updateAuthorPost(postId: string | number, payload: UpdatePostPayload): Observable<AuthorPost> {
    return this.http
      .patch<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts/${postId}`, payload)
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

  deleteAuthorPostPermanently(postId: string | number): Observable<void> {
    return this.http
      .delete<ApiItemResponse<{ id: string }>>(`${this.baseUrl}/author/posts/${postId}`)
      .pipe(map(() => undefined));
  }

  private authorPostAction(postId: string | number, action: string): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost>>(`${this.baseUrl}/author/posts/${postId}/${action}`, null)
      .pipe(map((response) => response.data));
  }

  private isLegacyPublicPost(post: PublicPost | Post): post is PublicPost {
    return 'originalLanguageId' in post;
  }

  private toLegacyPublicPost(post: Post): PublicPost {
    const originalIndex = Math.max(
      0,
      post.translations.findIndex(translation => translation.languageCode === post.originalLanguage),
    );
    const createdAt = post.createdAt;

    return {
      id: String(post.id),
      authorId: String(post.authorId),
      categoryId: post.categoryId,
      originalLanguageId: originalIndex + 1,
      status: post.status,
      reviewNote: null,
      viewCount: post.viewCount,
      publishedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      translations: post.translations.map((translation, index) => ({
        id: String(translation.id),
        languageId: index + 1,
        title: translation.title,
        slug: null,
        summary: null,
        content: translation.contentHtml,
        translationStatus: 'completed',
        translationProvider: null,
        createdAt,
        updatedAt: createdAt,
      })),
      translationMatrix: post.translations.map((_, index) => ({
        languageId: index + 1,
        status: 'completed',
        provider: null,
      })),
      author: {
        id: String(post.author.id),
        username: post.author.handle,
        displayName: post.author.name,
        avatarUrl: post.author.avatarUrl || null,
        bio: post.author.bio || null,
      },
      likeCount: post.likeCount || 0,
      commentCount: post.commentCount || 0,
    };
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
