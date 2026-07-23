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

  findAll(): Observable<Category[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<ApiResponse<Category[]>>(`${environment.apiUrl}/categories`)
        .pipe(
          map((res) => res.data),
          shareReplay(1),
        );
    }
    return this.cache$;
  }
}
