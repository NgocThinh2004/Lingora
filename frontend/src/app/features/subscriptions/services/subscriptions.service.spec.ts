import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';
import { SubscriptionAuthorsPage } from '../models/subscription.model';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
      ],
    });
    service = TestBed.inject(SubscriptionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps the paginated following response so callers can read its items', () => {
    const page: SubscriptionAuthorsPage = {
      items: [{
        id: '12',
        username: 'thai-reader',
        displayName: 'Thai Reader',
        avatarUrl: null,
        bio: null,
      }],
      meta: { total: 1, page: 1, totalPages: 1 },
    };
    let result = page;

    service.following().subscribe(response => result = response);
    http.expectOne(`${environment.apiUrl}/subscriptions/following`).flush({ data: page });

    expect(result.items).toEqual(page.items);
    expect(result.meta.total).toBe(1);
  });
});
