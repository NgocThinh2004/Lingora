import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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

  it('loads active languages and the selected static frontend bundle', () => {
    service.load();
    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagCode: 'vn', isDefault: true },
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: false },
      ],
    });
    httpTesting.expectOne('/locales/vi.json').flush({ home: 'Trang chủ' });

    expect(service.selectedLocale()).toBe('vi');
    expect(service.translate('home')).toBe('Trang chủ');
  });

  it('ignores locale codes that are not active', () => {
    service.selectLocale('ja');

    expect(service.selectedLocale()).toBe('en');
    expect(localStorage.getItem('preferredLanguage')).toBeNull();
  });

  it('loads a frontend locale file when an active locale is selected', () => {
    service.load();
    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: true },
        { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', isDefault: false },
      ],
    });
    httpTesting.expectOne('/locales/en.json').flush({ home: 'Home' });

    service.selectLocale('ja');
    httpTesting.expectOne('/locales/ja.json').flush({ home: 'ホーム', sign_out: 'ログアウト' });

    expect(service.translate('home')).toBe('ホーム');
    expect(service.translate('sign_out')).toBe('ログアウト');
  });

  it('restores a supported saved locale after a page reload', () => {
    localStorage.setItem('preferredLanguage', 'ja');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocaleService);
    httpTesting = TestBed.inject(HttpTestingController);

    service.load();
    httpTesting.expectOne(`${environment.apiUrl}/languages`).flush({
      data: [
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: true },
        { code: 'ja', name: 'Japanese', nativeName: '日本語', flagCode: 'jp', isDefault: false },
      ],
    });
    httpTesting.expectOne('/locales/ja.json').flush({ home: 'ホーム' });

    expect(service.selectedLocale()).toBe('ja');
    expect(service.translate('home')).toBe('ホーム');
  });

  it('switches the interface only after the requested bundle is ready', () => {
    service.selectLocale('vi');
    expect(service.selectedLocale()).toBe('en');

    httpTesting.expectOne('/locales/vi.json').flush({ home: 'Trang chủ' });

    expect(service.selectedLocale()).toBe('vi');
    expect(service.translate('home')).toBe('Trang chủ');
  });

  it('runs the language callback only after the requested bundle is applied', () => {
    let appliedLocale = '';

    service.setLanguage('vi', () => {
      appliedLocale = service.current();
    });

    expect(appliedLocale).toBe('');
    httpTesting.expectOne('/locales/vi.json').flush({});
    expect(appliedLocale).toBe('vi');
  });

  it('checks whether a manually maintained frontend bundle exists', () => {
    let japaneseExists = false;
    service.hasStaticBundle('ja').subscribe(exists => japaneseExists = exists);
    httpTesting.expectOne('/locales/ja.json').flush({ home: 'ホーム' });
    expect(japaneseExists).toBeTrue();

    let koreanExists = true;
    service.hasStaticBundle('ko').subscribe(exists => koreanExists = exists);
    httpTesting.expectOne('/locales/ko.json').flush(null, { status: 404, statusText: 'Not Found' });
    expect(koreanExists).toBeFalse();
  });
});
