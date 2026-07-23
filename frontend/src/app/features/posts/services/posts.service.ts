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
  Post,
  PublicPost,
  UpdatePostPayload,
  PaginatedResult,
} from '../models/post.model';
import { ApiResponse } from '../../../core/models/api-response.model';

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
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ---------------------------------------------------------
  // NEW API (from feature/homepage)
  // ---------------------------------------------------------

  list(query: PostQuery = {}): Observable<PaginatedResult<Post>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<ApiResponse<PaginatedResult<Post>>>(`${this.baseUrl}/posts`, { params })
      .pipe(map((res) => res.data));
  }

  getById(id: number): Observable<Post> {
    return this.http
      .get<ApiResponse<Post>>(`${this.baseUrl}/posts/${id}`)
      .pipe(map((res) => res.data));
  }

  getRelated(id: number): Observable<Post[]> {
    return this.http
      .get<ApiResponse<Post[]>>(`${this.baseUrl}/posts/${id}/related`)
      .pipe(map((res) => res.data));
  }

  create(payload: {
    categorySlug?: string;
    originalLanguage: string;
    coverImageUrl?: string;
    coverVideoUrl?: string;
    status?: 'draft' | 'published';
    translations: { languageCode: string; title: string; contentHtml: string }[];
  }): Observable<Post> {
    return this.http
      .post<ApiResponse<Post>>(`${this.baseUrl}/posts`, payload)
      .pipe(map((res) => res.data));
  }

  update(id: number, payload: Partial<Parameters<PostsService['create']>[0]>): Observable<Post> {
    return this.http
      .patch<ApiResponse<Post>>(`${this.baseUrl}/posts/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/posts/${id}`)
      .pipe(map((res) => res.data));
  }

  // ---------------------------------------------------------
  // LEGACY API (from develop branch)
  // ---------------------------------------------------------

  listAuthorPosts(params: PostListParams = {}): Observable<ApiCollectionResponse<AuthorPost>> {
    return this.http.get<ApiCollectionResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, {
      params: this.toHttpParams(params),
    });
  }

  listPublicPosts(params: Partial<Pick<PostListParams, 'search' | 'page' | 'limit'>> = {}): Observable<ApiCollectionResponse<PublicPost>> {
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
          data: response.data.items.map((post: any) => this.toLegacyPublicPost(post)),
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
      post.translations.findIndex((translation: any) => translation.languageCode === post.originalLanguage),
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
      translations: post.translations.map((translation: any, index: number) => ({
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
      translationMatrix: post.translations.map((_: any, index: number) => ({
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
