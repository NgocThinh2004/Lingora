import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminDashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the protected dashboard overview', () => {
    service.getOverview('vi').subscribe();

    const request = http.expectOne(req => req.url === `${environment.apiUrl}/admin/dashboard`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('lang')).toBe('vi');
    request.flush({ data: {} });
  });
});
