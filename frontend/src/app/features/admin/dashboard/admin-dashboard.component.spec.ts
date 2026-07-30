import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LocaleService } from '../../../core/locale/locale.service';
import { AdminDashboardOverview } from './models/admin-dashboard.model';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminDashboardService } from './services/admin-dashboard.service';

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let component: AdminDashboardComponent;
  let service: jasmine.SpyObj<AdminDashboardService>;
  const selectedLocale = signal('en');

  const overview: AdminDashboardOverview = {
    summary: { totalUsers: 12, totalArticles: 8, totalComments: 20, totalLikes: 30 },
    users: {
      total: 12,
      byRole: { admin: 2, member: 10 },
      byStatus: { active: 11, banned: 1 },
      growth: [
        { date: '2026-07-21', count: 0 },
        { date: '2026-07-22', count: 1 },
        { date: '2026-07-23', count: 2 },
      ],
    },
    posts: {
      total: 8,
      totalViews: 400,
      pendingReview: 3,
      byStatus: { published: 5, pending_review: 3 },
      topArticles: [{ id: '7', title: 'Real article', viewCount: 120 }],
      topCategories: [{ id: 2, name: 'Technology', count: 4, percentage: 50 }],
    },
    social: {
      comments: 20,
      commentsByStatus: { approved: 20 },
      postLikes: 30,
      commentLikes: 7,
      totalLikes: 37,
      follows: 14,
      topFollowedUsers: [
        { id: '2', username: 'alex', displayName: 'Alex', avatarUrl: null, followerCount: 9 },
      ],
    },
    translations: { failed: 2, completed: 9 },
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<AdminDashboardService>('AdminDashboardService', ['getOverview']);
    service.getOverview.and.returnValue(of({ data: overview }));
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AdminDashboardService, useValue: service },
        {
          provide: LocaleService,
          useValue: {
            selectedLocale,
            translate: (key: string) => ({
              top_followed_users: 'Top Followed Users',
              try_again: 'Try again',
            } as Record<string, string>)[key] ?? key,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  it('renders live values returned by the dashboard API', () => {
    fixture.detectChanges();
    fixture.detectChanges();

    expect(service.getOverview).toHaveBeenCalledOnceWith('en');
    expect(component.stats().map(stat => stat.value)).toEqual([12, 8, 20, 30]);
    expect(fixture.nativeElement.textContent).toContain('Real article');
    expect(fixture.nativeElement.textContent).toContain('Technology');
    expect(fixture.nativeElement.querySelector('a[href="/admin/users"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/posts"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/post/7"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Top Followed Users');
    expect(fixture.nativeElement.querySelector('a[href="/profile/2"]')).not.toBeNull();
  });

  it('shows a retry state when loading fails', () => {
    service.getOverview.and.returnValue(throwError(() => ({
      error: { meta: { error: { message: 'Database unavailable' } } },
    })));
    fixture.detectChanges();
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    expect(component.error()).toBe('unable_load_dashboard');
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });
});
