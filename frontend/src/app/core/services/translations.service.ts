import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItemResponse, TranslationStatus } from '../models/post.model';
import { TranslationAttempt, TranslationMatrixEntry, WorkerRunResult } from '../models/translation.model';

@Injectable({ providedIn: 'root' })
export class TranslationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly authorHeaders = new HttpHeaders({ 'x-user-id': '1' });
  private readonly adminHeaders = new HttpHeaders({ 'x-user-role': 'admin' });

  getPostMatrix(postId: string | number): Observable<TranslationMatrixEntry[]> {
    return this.http
      .get<ApiItemResponse<TranslationMatrixEntry[]>>(`${this.baseUrl}/translations/posts/${postId}/matrix`, {
        headers: this.authorHeaders,
      })
      .pipe(map((response) => response.data));
  }

  getAttempts(postTranslationId: string | number): Observable<TranslationAttempt[]> {
    return this.http
      .get<ApiItemResponse<TranslationAttempt[]>>(`${this.baseUrl}/translations/${postTranslationId}/attempts`, {
        headers: this.authorHeaders,
      })
      .pipe(map((response) => response.data));
  }

  retry(postTranslationId: string | number): Observable<TranslationMatrixEntry> {
    return this.http
      .post<ApiItemResponse<TranslationMatrixEntry>>(
        `${this.baseUrl}/translations/retry`,
        { postTranslationId },
        { headers: this.authorHeaders },
      )
      .pipe(map((response) => response.data));
  }

  runWorkerOnce(): Observable<WorkerRunResult> {
    return this.http
      .post<ApiItemResponse<WorkerRunResult>>(`${this.baseUrl}/translations/worker/run-once`, null, {
        headers: this.adminHeaders,
      })
      .pipe(map((response) => response.data));
  }

  getMetrics(): Observable<Record<TranslationStatus, number>> {
    return this.http
      .get<ApiItemResponse<Record<TranslationStatus, number>>>(`${this.baseUrl}/translations/metrics`, {
        headers: this.adminHeaders,
      })
      .pipe(map((response) => response.data));
  }
}
