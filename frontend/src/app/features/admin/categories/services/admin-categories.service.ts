import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../core/http/api-response.model';
import {
  AdminCategoriesQuery,
  AdminCategory,
  AdminCategoryPost,
  CreateAdminCategoryRequest,
  UpdateAdminCategoryRequest,
} from '../models/admin-category.model';

@Injectable({ providedIn: 'root' })
export class AdminCategoriesService {
  private readonly apiUrl = `${environment.apiUrl}/admin/categories`;

  constructor(private readonly http: HttpClient) {}

  getCategories(query: AdminCategoriesQuery): Observable<ApiResponse<AdminCategory[]>> {
    const params = new HttpParams()
      .set('search', query.search)
      .set('status', query.status)
      .set('postFilter', query.postFilter)
      .set('sort', query.sort)
      .set('page', query.page)
      .set('limit', query.limit);
    return this.http.get<ApiResponse<AdminCategory[]>>(this.apiUrl, { params });
  }

  getCategoryPosts(categoryId: number, language: string): Observable<ApiResponse<AdminCategoryPost[]>> {
    const params = new HttpParams().set('language', language);
    return this.http.get<ApiResponse<AdminCategoryPost[]>>(`${this.apiUrl}/${categoryId}/posts`, { params });
  }

  createCategory(payload: CreateAdminCategoryRequest): Observable<ApiResponse<AdminCategory>> {
    return this.http.post<ApiResponse<AdminCategory>>(this.apiUrl, payload);
  }

  updateCategory(
    categoryId: number,
    payload: UpdateAdminCategoryRequest,
  ): Observable<ApiResponse<AdminCategory>> {
    return this.http.patch<ApiResponse<AdminCategory>>(`${this.apiUrl}/${categoryId}`, payload);
  }

  deleteCategory(categoryId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${categoryId}`);
  }
}
