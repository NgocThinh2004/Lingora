import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { AdminCategoriesService } from './admin-categories.service';

describe('AdminCategoriesService', () => {
  let service: AdminCategoriesService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminCategoriesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends category filters to the admin endpoint', () => {
    service.getCategories({
      search: 'design', status: 'active', postFilter: 'with-posts', sort: 'name', page: 2, limit: 8,
    }).subscribe();

    const request = httpTesting.expectOne(req => req.url === `${environment.apiUrl}/admin/categories`);
    expect(request.request.params.get('search')).toBe('design');
    expect(request.request.params.get('status')).toBe('active');
    expect(request.request.params.get('postFilter')).toBe('with-posts');
    expect(request.request.params.get('sort')).toBe('name');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ data: [] });
  });

  it('creates and deletes categories through the expected endpoints', () => {
    const payload = { translations: [{ languageId: 1, name: 'Design', slug: 'design' }] };
    service.createCategory(payload).subscribe();
    const create = httpTesting.expectOne(`${environment.apiUrl}/admin/categories`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ data: {} });

    service.deleteCategory(12).subscribe();
    const remove = httpTesting.expectOne(`${environment.apiUrl}/admin/categories/12`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('loads the posts for a category in the selected language', () => {
    service.getCategoryPosts(12, 'vi').subscribe();

    const request = httpTesting.expectOne(req => req.url === `${environment.apiUrl}/admin/categories/12/posts`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('language')).toBe('vi');
    request.flush({ data: [], meta: { total: 0, shown: 0 } });
  });
});
