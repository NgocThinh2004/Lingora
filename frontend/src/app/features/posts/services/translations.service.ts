import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiItemResponse } from '../../../core/http/api-response.model';
import {
  TranslationMatrixItem,
  TranslationPreview,
} from '../models/post.model';

/**
 * TranslationsService - Dịch vụ xử lý liên quan đến dịch thuật nội dung (bài viết)
 * 
 * DB: Tương tác với bảng `post_translations` để lưu trữ trạng thái và nội dung dịch của từng ngôn ngữ,
 * có thể sử dụng các provider dịch bên ngoài như Google Translate, DeepL.
 */
@Injectable({ providedIn: 'root' })
export class TranslationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/translations`;

  /**
   * Lấy ma trận trạng thái dịch của một bài viết (danh sách các ngôn ngữ đang được hỗ trợ, trạng thái dịch).
   */
  getMatrix(postId: string | number): Observable<TranslationMatrixItem[]> {
    return this.http
      .get<ApiItemResponse<TranslationMatrixItem[]>>(`${this.baseUrl}/posts/${postId}/matrix`)
      .pipe(map(response => response.data));
  }

  /**
   * Lấy bản xem trước (preview) nội dung đã được dịch lưu trữ trên hệ thống của một ngôn ngữ.
   */
  getStoredPreview(
    postId: string | number,
    languageId: number,
  ): Observable<TranslationMatrixItem> {
    return this.http
      .get<ApiItemResponse<TranslationMatrixItem>>(
        `${this.baseUrl}/posts/${postId}/preview/${languageId}`,
      )
      .pipe(map(response => response.data));
  }

  /**
   * Thực hiện gọi API để xem trước bản dịch (có thể tốn tài nguyên gọi API dịch thuật bên thứ 3) 
   * trước khi quyết định lưu chính thức vào database.
   */
  preview(payload: {
    title: string;
    content: string;
    sourceLanguageId: number;
    targetLanguageId: number;
  }): Observable<TranslationPreview> {
    return this.http
      .post<ApiItemResponse<TranslationPreview>>(`${this.baseUrl}/preview`, payload)
      .pipe(map(response => response.data));
  }
}
