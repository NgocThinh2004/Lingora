import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Language } from '../models/language.model';
import { ApiResponse } from '../models/api-response.model';

const LANG_KEY = 'preferredLanguage';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly currentSignal = signal<string>(localStorage.getItem(LANG_KEY) || 'en');
  readonly current = computed(() => this.currentSignal());

  constructor(private readonly http: HttpClient) {}

  findAll(): Observable<Language[]> {
    return this.http
      .get<ApiResponse<Language[]>>(`${environment.apiUrl}/languages`)
      .pipe(map((res) => res.data));
  }

  setLanguage(code: string) {
    localStorage.setItem(LANG_KEY, code);
    this.currentSignal.set(code);
  }
}
