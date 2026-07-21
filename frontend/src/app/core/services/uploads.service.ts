import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse } from '../models/post.model';
import { EditorMediaType, UploadResponse } from '../models/upload.model';

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly staticBaseUrl = environment.apiUrl.replace('/api/v1', '');
  private readonly authorHeaders = new HttpHeaders({ 'x-user-id': '1' });

  uploadEditorMedia(mediaType: EditorMediaType, file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append(mediaType, file);

    return this.http
      .post<ApiItemResponse<UploadResponse>>(`${this.baseUrl}/uploads/editor-${mediaType}`, formData, {
        headers: this.authorHeaders,
      })
      .pipe(map((response) => response.data));
  }

  toAbsoluteUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return `${this.staticBaseUrl}${url}`;
  }
}
