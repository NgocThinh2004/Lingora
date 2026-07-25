import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/http/api-response.model';
import { User } from '../../users/models/user.model';
import { Category } from '../../categories/models/category.model';

export interface SearchCategory {
  id: number;
  slug: string;
  name: string;
}

export interface SearchPost {
  id: number;
  title: string;
  imageUrl: string | null;
  createdAt: string;
  author: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
}

export interface SearchResults {
  users: User[];
  categories: SearchCategory[];
  posts: SearchPost[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private readonly http: HttpClient) {}

  globalSearch(q: string): Observable<SearchResults> {
    const params = new HttpParams().set('q', q);
    return this.http
      .get<ApiResponse<SearchResults>>(`${environment.apiUrl}/search`, { params })
      .pipe(map((res) => res.data));
  }
}
