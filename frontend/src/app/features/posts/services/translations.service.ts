import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiItemResponse,
  TranslationMatrixItem,
  TranslationPreview,
} from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class TranslationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/translations`;

  getMatrix(postId: string | number): Observable<TranslationMatrixItem[]> {
    return this.http
      .get<ApiItemResponse<TranslationMatrixItem[]>>(`${this.baseUrl}/posts/${postId}/matrix`)
      .pipe(map(response => response.data));
  }

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
