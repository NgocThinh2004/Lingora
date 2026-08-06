import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { LocaleService } from '../../../core/locale/locale.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AdminCategoriesService } from '../categories/services/admin-categories.service';
import { AdminPostsComponent } from './admin-posts.component';
import { AdminPost } from './models/admin-post.model';
import { AdminPostsService } from './services/admin-posts.service';

describe('AdminPostsComponent', () => {
  let fixture: ComponentFixture<AdminPostsComponent>;
  let component: AdminPostsComponent;
  let postsService: jasmine.SpyObj<AdminPostsService>;
  const post: AdminPost = {
    id: '12', title: 'Angular signals', author: { id: '3', name: 'An', avatarUrl: null },
    category: { id: 4, name: 'Technology', status: 'active' }, submittedAt: '2026-07-22T08:00:00.000Z',
    originalLanguage: { languageId: 1, code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb' },
    translations: [
      { id: '1', languageId: 1, code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb', status: 'completed', isOriginal: true },
      { id: '2', languageId: 2, code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagCode: 'vn', status: 'not_started', isOriginal: false },
      { id: '3', languageId: 3, code: 'zh', name: 'Chinese', nativeName: '中文', flagCode: 'cn', status: 'not_started', isOriginal: false },
    ],
    status: 'pending', workflowStatus: 'pending_review', content: '<p>Preview</p>', reviewNote: null,
  };

  beforeEach(async () => {
    postsService = jasmine.createSpyObj<AdminPostsService>('AdminPostsService', ['getPosts', 'getPost', 'reviewPost']);
    postsService.getPosts.and.returnValue(of({ success: true, status: 200, message: 'ok', data: [post], meta: { total: 1, page: 1, limit: 8, totalPages: 1 } }));
    postsService.getPost.and.returnValue(of({ success: true, status: 200, message: 'ok', data: post }));
    postsService.reviewPost.and.returnValue(of({ success: true, status: 200, message: 'ok', data: { ...post, status: 'approved' } }));
    const categories = jasmine.createSpyObj<AdminCategoriesService>('AdminCategoriesService', ['getCategories']);
    categories.getCategories.and.returnValue(of({ success: true, status: 200, message: 'ok', data: [] }));
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError']);
    await TestBed.configureTestingModule({
      imports: [AdminPostsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminPostsService, useValue: postsService },
        { provide: AdminCategoriesService, useValue: categories },
        { provide: ToastService, useValue: toast },
        { provide: LocaleService, useValue: { selectedLocale: signal('en'), translate: (key: string) => key } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminPostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows one target flag and summarizes the remaining targets', () => {
    expect(fixture.nativeElement.querySelectorAll('.translation-flag img').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.translation-more').textContent.trim()).toBe('+1');
  });

  it('formats numeric database ids without stopping the rest of the row from rendering', () => {
    expect(component.postCode(1 as unknown as string)).toBe('P-1');
    expect(fixture.nativeElement.querySelector('.author-cell').textContent).toContain('An');
    expect(fixture.nativeElement.querySelector('.status-pill').textContent).toContain('Pending');
  });

  it('opens the review panel when a row is clicked', () => {
    (fixture.nativeElement.querySelector('.post-row') as HTMLElement).click();
    fixture.detectChanges();
    expect(postsService.getPost).toHaveBeenCalledWith('12', 'en');
    expect(fixture.nativeElement.querySelector('.review-panel')).not.toBeNull();
  });

  it('closes immediately while the detail request is still pending', () => {
    const pendingDetail = new Subject<any>();
    postsService.getPost.and.returnValue(pendingDetail);
    component.openReview(post);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.panel-close') as HTMLButtonElement).click();
    pendingDetail.next({ data: post });
    fixture.detectChanges();

    expect(component.panelOpen()).toBeFalse();
    expect(component.selectedPost()).toBeNull();
    expect(fixture.nativeElement.querySelector('.review-panel')).toBeNull();
  });

  it('requires a note before rejecting', () => {
    component.openReview(post);
    component.review('reject');
    expect(component.noteInvalid()).toBeTrue();
    expect(postsService.reviewPost).not.toHaveBeenCalled();
  });
});
