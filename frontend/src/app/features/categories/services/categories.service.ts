import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Category } from '../models/category.model';
import { ApiResponse } from '../../../core/http/api-response.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private cache$?: Observable<Category[]>;

  constructor(private readonly http: HttpClient) {}

  findAll(q?: string, lang?: string): Observable<Category[]> {
    const params: any = {};
    if (q) params.q = q;
    if (lang) params.lang = lang;

    const request = this.http
      .get<ApiResponse<Category[]>>(`${environment.apiUrl}/categories`, { params })
      .pipe(map((res) => res.data));

    if (!q && !lang) {
      if (!this.cache$) {
        this.cache$ = request.pipe(shareReplay(1));
      }
      return this.cache$;
    }

    return request;
  }
}
