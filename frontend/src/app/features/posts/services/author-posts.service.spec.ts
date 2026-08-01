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

  it('creates and updates incomplete drafts through the autosave endpoints', () => {
    const payload = {
      title: 'Incomplete title',
      originalLanguageId: 1,
      content: '',
    };
    const created = { id: '9', status: 'draft' } as AuthorPost;
    const updated = { id: '9', status: 'draft' } as AuthorPost;
    let createResult: AuthorPost | undefined;
    let updateResult: AuthorPost | undefined;

    service.autosaveAuthorPost(payload).subscribe(value => createResult = value);
    const createRequest = httpTesting.expectOne(`${environment.apiUrl}/author/posts/autosave`);
    expect(createRequest.request.method).toBe('POST');
    createRequest.flush({ data: created });

    service.autosaveAuthorPost(payload, created.id).subscribe(value => updateResult = value);
    const updateRequest = httpTesting.expectOne(
      `${environment.apiUrl}/author/posts/${created.id}/autosave`,
    );
    expect(updateRequest.request.method).toBe('PATCH');
    updateRequest.flush({ data: updated });

    expect(createResult).toBe(created);
    expect(updateResult).toBe(updated);
  });

  it('loads the current author filter months from the API', () => {
    let months: string[] | undefined;

    service.getAuthorPostFilterOptions().subscribe(options => months = options.updatedMonths);

    const request = httpTesting.expectOne(`${environment.apiUrl}/author/posts/options/filters`);
    request.flush({ data: { languages: [], categories: [], updatedMonths: ['2026-07', '2026-06'] } });

    expect(months).toEqual(['2026-07', '2026-06']);
  });

  it('discards a persisted draft through the dedicated endpoint', () => {
    let completed = false;

    service.discardAuthorDraft('9').subscribe(() => completed = true);

    const request = httpTesting.expectOne(`${environment.apiUrl}/author/posts/9/draft`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ data: { id: '9' } });

    expect(completed).toBe(true);
  });
});
