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

    httpTesting.expectOne(`${environment.apiUrl}/locales/vi`).flush({ data: {} });

    expect(service.options()).toEqual([
      jasmine.objectContaining({ code: 'vi', label: 'Tiếng Việt', isDefault: true }),
      jasmine.objectContaining({ code: 'ja', flagUrl: 'https://flagcdn.com/w40/jp.png' }),
    ]);
  });

  it('falls back to the API default when the saved language is no longer active', () => {
    service.selectLocale('zh');
    httpTesting.expectOne(`${environment.apiUrl}/locales/zh`).flush(null, { status: 500, statusText: 'Unavailable' });
    service.load();

    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagCode: 'vn', isDefault: true },
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: false },
      ],
    });

    httpTesting.expectOne(`${environment.apiUrl}/locales/vi`).flush({ data: {} });

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

    httpTesting.expectOne(`${environment.apiUrl}/locales/en`).flush({ data: {} });

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

    expect(service.selectedLocale()).toBe('en');
    service.load();
    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: true },
        { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', isDefault: false },
      ],
    });
    httpTesting.expectOne(`${environment.apiUrl}/locales/ja`).flush({ data: { home: 'ホーム' } });
    expect(service.selectedLocale()).toBe('ja');
    expect(service.translate('home')).toBe('ホーム');
  });

  it('switches the interface only after the requested bundle is ready', () => {
    service.selectLocale('vi');
    expect(service.selectedLocale()).toBe('en');
    httpTesting.expectOne(`${environment.apiUrl}/locales/vi`).flush({ data: {
      home: 'Trang chủ',
      more: 'Thêm',
      my_posts_title: 'Bài viết của tôi',
      original_language: 'Ngôn ngữ gốc',
      items: 'bài viết',
    } });
    expect(service.selectedLocale()).toBe('vi');
    expect(service.translate('home')).toBe('Trang chủ');
    expect(service.translate('more')).toBe('Thêm');
    expect(service.translate('my_posts_title')).toBe('Bài viết của tôi');
    expect(service.translate('original_language')).toBe('Ngôn ngữ gốc');
    expect(service.translate('items')).toBe('bài viết');

    service.selectLocale('zh');
    expect(service.selectedLocale()).toBe('vi');
    httpTesting.expectOne(`${environment.apiUrl}/locales/zh`).flush({ data: {
      sign_out: '退出登录',
      search_posts: '搜索你的文章...',
      item: '篇文章',
    } });
    expect(service.selectedLocale()).toBe('zh');
    expect(service.translate('sign_out')).toBe('退出登录');
    expect(service.translate('search_posts')).toBe('搜索你的文章...');
    expect(service.translate('item')).toBe('篇文章');
  });

  it('reloads an already cached bundle when the user selects it again', () => {
    service.selectLocale('vi');
    httpTesting.expectOne(`${environment.apiUrl}/locales/vi`).flush({ data: { home: 'Trang chủ' } });
    expect(service.translate('home')).toBe('Trang chủ');

    service.selectLocale('vi');
    httpTesting.expectOne(`${environment.apiUrl}/locales/vi`).flush({ data: { home: 'Trang chủ mới' } });
    expect(service.translate('home')).toBe('Trang chủ mới');
  });
});
