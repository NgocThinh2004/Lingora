import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AuthorPost } from '../models/post.model';
import { AuthorPostsService } from './author-posts.service';

describe('AuthorPostsService', () => {
  let service: AuthorPostsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthorPostsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('returns the created post from a standard API envelope', () => {
    const post = { id: '7', status: 'draft' } as AuthorPost;
    let result: AuthorPost | undefined;

    service.createAuthorPost({
      title: 'Test',
      originalLanguageId: 1,
      content: '<p>Content</p>',
    }).subscribe(value => result = value);

    const request = httpTesting.expectOne(`${environment.apiUrl}/author/posts`);
    request.flush({ data: post });

    expect(result).toBe(post);
  });

  it('temporarily accepts the legacy double-wrapped API envelope', () => {
    const post = { id: '8', status: 'draft' } as AuthorPost;
    let result: AuthorPost | undefined;

    service.createAuthorPost({
      title: 'Legacy response',
      originalLanguageId: 1,
      content: '<p>Content</p>',
    }).subscribe(value => result = value);

    const request = httpTesting.expectOne(`${environment.apiUrl}/author/posts`);
    request.flush({ data: { data: post } });

    expect(result).toBe(post);
  });

  it('loads the current author filter months from the API', () => {
    let months: string[] | undefined;

    service.getAuthorPostFilterOptions().subscribe(options => months = options.updatedMonths);

    const request = httpTesting.expectOne(`${environment.apiUrl}/author/posts/options/filters`);
    request.flush({ data: { languages: [], categories: [], updatedMonths: ['2026-07', '2026-06'] } });

    expect(months).toEqual(['2026-07', '2026-06']);
  });
});
