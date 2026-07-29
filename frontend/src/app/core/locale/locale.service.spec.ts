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
    expect(localStorage.getItem('preferredLanguage')).toBe('vi');
  });

  it('ignores locale codes that are not active', () => {
    service.selectLocale('ja');

    expect(service.selectedLocale()).toBe('en');
    expect(localStorage.getItem('lingora-locale')).toBeNull();
  });

  it('loads a generated UI bundle when a newly active locale is selected', () => {
    service.load();
    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: true },
        { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', isDefault: false },
      ],
    });

    service.selectLocale('ja');
    httpTesting.expectOne(`${environment.apiUrl}/locales/ja`).flush({
      data: { home: 'ホーム', sign_out: 'ログアウト' },
    });

    expect(service.translate('home')).toBe('ホーム');
    expect(service.translate('sign_out')).toBe('ログアウト');
  });

  it('restores a dynamically added locale after a page reload', () => {
    localStorage.setItem('preferredLanguage', 'ja');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocaleService);
    httpTesting = TestBed.inject(HttpTestingController);

    expect(service.selectedLocale()).toBe('ja');
    service.load();
    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: true },
        { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', isDefault: false },
      ],
    });
    httpTesting.expectOne(`${environment.apiUrl}/locales/ja`).flush({ data: { home: 'ホーム' } });
    expect(service.translate('home')).toBe('ホーム');
  });

  it('translates the shared sidebar and My Posts labels from core.js', () => {
    service.selectLocale('vi');
    expect(service.translate('home')).toBe('Trang chủ');
    expect(service.translate('more')).toBe('Thêm');
    expect(service.translate('my_posts_title')).toBe('Bài viết của tôi');
    expect(service.translate('original_language')).toBe('Ngôn ngữ gốc');
    expect(service.translate('items')).toBe('bài viết');

    service.selectLocale('zh');
    expect(service.translate('sign_out')).toBe('退出登录');
    expect(service.translate('search_posts')).toBe('搜索你的文章...');
    expect(service.translate('item')).toBe('篇文章');
  });
});
