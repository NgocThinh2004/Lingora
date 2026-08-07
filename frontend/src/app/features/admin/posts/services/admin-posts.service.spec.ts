import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { AdminPostsService } from './admin-posts.service';

describe('AdminPostsService', () => {
  let service: AdminPostsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminPostsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends all moderation filters to the posts endpoint', () => {
    service.getPosts({ search: 'angular', status: 'pending', categoryId: 4, language: 'vi', page: 2, limit: 8 }).subscribe();
    const request = httpTesting.expectOne(req => req.url === `${environment.apiUrl}/admin/posts`);
    expect(request.request.params.get('search')).toBe('angular');
    expect(request.request.params.get('status')).toBe('pending');
    expect(request.request.params.get('categoryId')).toBe('4');
    expect(request.request.params.get('language')).toBe('vi');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ data: [] });
  });

  it('reviews a post through the expected endpoint', () => {
    service.reviewPost('12', { decision: 'reject', note: 'Needs work' }, 'en').subscribe();
    const request = httpTesting.expectOne(req => req.url === `${environment.apiUrl}/admin/posts/12/review`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ decision: 'reject', note: 'Needs work' });
    expect(request.request.params.get('language')).toBe('en');
    request.flush({ data: {} });
  });

  it('requests localized post content for read-only previews', () => {
    service.getPost('12', 'vi', true).subscribe();

    const request = httpTesting.expectOne(req => req.url === `${environment.apiUrl}/admin/posts/12`);
    expect(request.request.params.get('language')).toBe('vi');
    expect(request.request.params.get('localized')).toBe('true');
    request.flush({ data: {} });
  });
});
