
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiItemResponse } from '../../../core/http/api-response.model';
import { EditorMediaType, UploadResponse } from '../models/editor-upload.model';

@Injectable({ providedIn: 'root' })
export class EditorUploadsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly staticBaseUrl = environment.apiUrl.replace('/api/v1', '');

  uploadEditorMedia(mediaType: EditorMediaType, file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append(mediaType, file);

    return this.http
      .post<ApiItemResponse<UploadResponse>>(`${this.baseUrl}/uploads/editor-${mediaType}`, formData)
      .pipe(map((response) => response.data));
  }

  toAbsoluteUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return `${this.staticBaseUrl}${url}`;
  }
}
