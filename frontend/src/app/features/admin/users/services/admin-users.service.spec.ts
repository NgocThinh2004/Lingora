import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminUsersService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('builds list filters without sending empty query values', () => {
    service.getUsers({
      search: 'member',
      role: 'member',
      status: 'active',
      page: 2,
      limit: 10,
    }).subscribe();

    const request = httpTesting.expectOne(req =>
      req.url === `${environment.apiUrl}/admin/users`
      && req.params.get('search') === 'member'
      && req.params.get('role') === 'member'
      && req.params.get('status') === 'active'
      && req.params.get('page') === '2'
      && req.params.get('limit') === '10',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: { pagination: { total: 0, page: 2, limit: 10, totalPages: 0 } } });
  });

  it('updates only the selected admin user', () => {
    service.updateUser('7', { role: 'admin', status: 'active' }).subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/admin/users/7`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ role: 'admin', status: 'active' });
    request.flush({ data: {} });
  });
});
