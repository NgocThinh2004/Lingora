import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let service: LocaleService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocaleService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('loads active languages from the public API', () => {
    service.load();

    const request = httpTesting.expectOne(`${environment.apiUrl}/languages`);
    request.flush({
      data: [
        { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagCode: 'vn', isDefault: true },
        { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', isDefault: false },
      ],
    });

    expect(service.options()).toEqual([
      jasmine.objectContaining({ code: 'vi', label: 'Tiếng Việt', isDefault: true }),
      jasmine.objectContaining({ code: 'ja', flagUrl: 'https://flagcdn.com/w40/jp.png' }),
    ]);
  });

  it('falls back to the API default when the saved language is no longer active', () => {
    service.selectLocale('zh');
    service.load();

    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagCode: 'vn', isDefault: true },
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: false },
      ],
    });

    expect(service.selectedLocale()).toBe('vi');
    expect(localStorage.getItem('lingora-locale')).toBe('vi');
  });

  it('ignores locale codes that are not active', () => {
    service.selectLocale('ja');

    expect(service.selectedLocale()).toBe('en');
    expect(localStorage.getItem('lingora-locale')).toBeNull();
  });
});
