import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiCollectionResponse, ApiItemResponse } from '../../../core/http/api-response.model';
import {
  AuthorPost,
  CreatePostPayload,
  PostListParams,
  PostOptions,
  UpdatePostPayload,
} from '../models/post.model';

/**
 * AuthorPostsService - Dịch vụ quản lý các bài viết của tác giả (Tạo, Sửa, Xóa, Lấy danh sách)
 * 
 * Mục đích: Tương tác với backend thông qua HTTP requests để quản lý nội dung.
 * - Nhận và gửi dữ liệu từ API.
 * - Xử lý map dữ liệu (unwrap data) để trả về payload trực tiếp cho ứng dụng.
 */
@Injectable({ providedIn: 'root' })
export class AuthorPostsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Lấy danh sách bài viết do chính tác giả tạo */
  listAuthorPosts(params: PostListParams = {}): Observable<ApiCollectionResponse<AuthorPost>> {
    return this.http.get<ApiCollectionResponse<AuthorPost>>(`${this.baseUrl}/author/posts`, {
      params: this.toHttpParams(params),
    });
  }

  /** Lấy các tùy chọn (danh mục, thẻ, v.v.) để tạo/sửa bài viết */
  getPostOptions(): Observable<PostOptions> {
    return this.http
      .get<ApiItemResponse<PostOptions | ApiItemResponse<PostOptions>>>(`${this.baseUrl}/posts/options`)
      .pipe(map(response => this.unwrapItem(response))); // Xử lý bóc tách vỏ dữ liệu bọc ngoài
  }

  /** Lấy các tùy chọn để phục vụ cho việc lọc (filter) trên trang danh sách */
  getAuthorPostFilterOptions(): Observable<PostOptions> {
    return this.http
      .get<ApiItemResponse<PostOptions | ApiItemResponse<PostOptions>>>(`${this.baseUrl}/author/posts/options/filters`)
      .pipe(map(response => this.unwrapItem(response)));
  }

  /** Lấy thông tin chi tiết một bài viết cụ thể của tác giả */
  getAuthorPost(postId: string | number, includeDeleted = false): Observable<AuthorPost> {
    // Nếu includeDeleted = true, thêm tham số '?trash=true'
    const params = includeDeleted ? new HttpParams().set('trash', 'true') : undefined;

    return this.http
      .get<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(
        `${this.baseUrl}/author/posts/${postId}`,
        { params },
      )
      .pipe(map(response => this.unwrapItem(response)));
  }

  /** Tạo bài viết mới */
  createAuthorPost(payload: CreatePostPayload): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(`${this.baseUrl}/author/posts`, payload)
      .pipe(map(response => this.unwrapItem(response)));
  }

  /** Tự động lưu bản nháp của bài viết. Phân biệt theo postId để POST (mới) hay PATCH (cập nhật). */
  autosaveAuthorPost(payload: CreatePostPayload, postId?: string | number): Observable<AuthorPost> {
    const request = postId
      ? this.http.patch<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(
          `${this.baseUrl}/author/posts/${postId}/autosave`,
          payload,
        )
      : this.http.post<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(
          `${this.baseUrl}/author/posts/autosave`,
          payload,
        );

    return request.pipe(map(response => this.unwrapItem(response)));
  }

  /** Cập nhật nội dung/trạng thái bài viết */
  updateAuthorPost(postId: string | number, payload: UpdatePostPayload): Observable<AuthorPost> {
    return this.http
      .patch<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(
        `${this.baseUrl}/author/posts/${postId}`,
        payload,
      )
      .pipe(map(response => this.unwrapItem(response)));
  }

  /** Gửi bài viết để xuất bản (submit) */
  submitAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'submit');
  }

  /** Đưa bài viết vào lưu trữ (archive) */
  archiveAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'archive');
  }

  /** Phục hồi bài viết từ trạng thái lưu trữ */
  restoreAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'restore');
  }

  /** Xóa tạm bài viết (đưa vào thùng rác) */
  trashAuthorPost(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'trash');
  }

  /** Khôi phục bài viết từ thùng rác */
  restoreAuthorPostFromTrash(postId: string | number): Observable<AuthorPost> {
    return this.authorPostAction(postId, 'restore-trash');
  }

  /** Xóa vĩnh viễn bài viết khỏi cơ sở dữ liệu */
  deleteAuthorPostPermanently(postId: string | number): Observable<void> {
    return this.http
      .delete<ApiItemResponse<{ id: string }>>(`${this.baseUrl}/author/posts/${postId}`)
      .pipe(map(() => undefined));
  }

  discardAuthorDraft(postId: string | number): Observable<void> {
    return this.http
      .delete<ApiItemResponse<{ id: string }>>(`${this.baseUrl}/author/posts/${postId}/draft`)
      .pipe(map(() => undefined));
  }

  /** Hàm tiện ích gom chung logic gửi request cho các hành động thay đổi trạng thái (submit, trash, v.v.) */
  private authorPostAction(postId: string | number, action: string): Observable<AuthorPost> {
    return this.http
      .post<ApiItemResponse<AuthorPost | ApiItemResponse<AuthorPost>>>(
        `${this.baseUrl}/author/posts/${postId}/${action}`,
        null,
      )
      .pipe(map(response => this.unwrapItem(response)));
  }

  /** 
   * Hàm tiện ích giúp trích xuất trực tiếp dữ liệu (data) ra khỏi wrapper response của API.
   */
  private unwrapItem<T>(response: ApiItemResponse<T | ApiItemResponse<T>>): T {
    const value = response.data;
    if (value && typeof value === 'object' && 'data' in value) {
      return (value as any).data;
    }

    return value as T;
  }

  /** Chuyển đổi một plain object thành HttpParams để nối vào query string của URL */
  private toHttpParams(params: PostListParams): HttpParams {
    return Object.entries(params).reduce((httpParams, [key, value]) => {
      // Bỏ qua các giá trị rỗng hoặc undefined
      if (value === undefined || value === null || value === '') {
        return httpParams;
      }

      return httpParams.set(key, String(value));
    }, new HttpParams());
  }
}
