import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import {
  AdminLanguage,
  CreateAdminLanguageRequest,
  UpdateAdminLanguageRequest,
} from '../models/admin-language.model';

@Injectable({ providedIn: 'root' })
export class AdminLanguagesService {
  private readonly apiUrl = `${environment.apiUrl}/admin/languages`;

  constructor(private readonly http: HttpClient) {}

  getLanguages(page = 1, limit = 8): Observable<ApiResponse<AdminLanguage[]>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ApiResponse<AdminLanguage[]>>(this.apiUrl, { params });
  }

  createLanguage(payload: CreateAdminLanguageRequest): Observable<ApiResponse<AdminLanguage>> {
    return this.http.post<ApiResponse<AdminLanguage>>(this.apiUrl, payload);
  }

  updateLanguage(
    languageId: number,
    payload: UpdateAdminLanguageRequest,
  ): Observable<ApiResponse<AdminLanguage>> {
    return this.http.patch<ApiResponse<AdminLanguage>>(`${this.apiUrl}/${languageId}`, payload);
  }
}
