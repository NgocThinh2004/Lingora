import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
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
    http.expectOne(request => request.url.endsWith('/locales/fr')).flush({
      data: { settings: 'Paramètres', default_label: 'Default' },
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Français');
    expect(text).toContain('French');
    expect(text).toContain('Default');
    expect(localStorage.getItem('preferredLanguage')).toBe('fr');
    http.verify();
  });
});
