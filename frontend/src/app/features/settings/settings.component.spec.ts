import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ToastService } from '../../core/notifications/toast.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('shows the language confirmation after the selected static bundle is applied', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const http = TestBed.inject(HttpTestingController);
    const showSuccess = spyOn(TestBed.inject(ToastService), 'showSuccess');

    fixture.detectChanges();
    http.expectOne(request => request.url.endsWith('/languages')).flush({
      data: [
        { code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', isDefault: true },
        { code: 'zh', name: 'Chinese', nativeName: '中文', flagCode: 'cn', isDefault: false },
      ],
    });
    http.expectOne('/locales/en.json').flush({ feed_language: 'Feed language' });

    fixture.componentInstance.selectLanguage({
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      flagCode: 'cn',
      isDefault: false,
    });

    expect(showSuccess).not.toHaveBeenCalled();
    http.expectOne('/locales/zh.json').flush({ feed_language: '信息流语言' });
    expect(showSuccess).toHaveBeenCalledWith('信息流语言: 中文');
    http.verify();
  });

  it('renders the active languages returned by the public API', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    const http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    http.expectOne(request => request.url.endsWith('/languages')).flush({
      data: [
        {
          code: 'fr',
          name: 'French',
          nativeName: 'Français',
          flagCode: 'fr',
          isDefault: true,
        },
      ],
    });
    http.expectOne('/locales/fr.json').flush({ settings: 'Paramètres', default_label: 'Default' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Français');
    expect(text).toContain('French');
    expect(text).toContain('Default');
    expect(localStorage.getItem('preferredLanguage')).toBe('fr');
    http.verify();
  });
});
