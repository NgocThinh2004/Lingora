import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { AdminLanguagesService } from './admin-languages.service';

describe('AdminLanguagesService', () => {
  let service: AdminLanguagesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminLanguagesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a paginated language directory', () => {
    service.getLanguages(2, 8).subscribe();

    const request = http.expectOne(req =>
      req.url === `${environment.apiUrl}/admin/languages`
      && req.params.get('page') === '2'
      && req.params.get('limit') === '8');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [] });
  });

  it('creates and updates a language', () => {
    service.createLanguage({
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagCode: 'jp',
    }).subscribe();
    const createRequest = http.expectOne(`${environment.apiUrl}/admin/languages`);
    expect(createRequest.request.method).toBe('POST');
    createRequest.flush({ data: {} });

    service.updateLanguage(4, { name: 'Japanese language', isDefault: true }).subscribe();
    const updateRequest = http.expectOne(`${environment.apiUrl}/admin/languages/4`);
    expect(updateRequest.request.method).toBe('PATCH');
    expect(updateRequest.request.body).toEqual({ name: 'Japanese language', isDefault: true });
    updateRequest.flush({ data: {} });
  });
});
