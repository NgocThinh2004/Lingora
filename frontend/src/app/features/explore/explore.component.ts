import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild, effect, inject, untracked, DestroyRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject, debounceTime, distinctUntilChanged, Subscription, forkJoin, map, switchMap, tap, of, catchError } from 'rxjs';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { UsersService } from '../users/services/users.service';
import { CategoriesService } from '../categories/services/categories.service';
import { translateCategory, Category } from '../categories/models/category.model';
import { CommonModule } from '@angular/common';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { FormsModule } from '@angular/forms';
import { AuthorTooltipComponent } from '../users/components/author-tooltip/author-tooltip.component';
import { SubscribeButtonComponent } from '../subscriptions/components/subscribe-button/subscribe-button.component';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LocaleService } from '../../core/locale/locale.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, FormsModule, AuthorTooltipComponent, SubscribeButtonComponent, AssetImageDirective, TranslatePipe],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss'
})
export class ExploreComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('stickyHeader') stickyHeaderRef!: ElementRef<HTMLElement>;

  @ViewChild('infiniteScrollTrigger') set infiniteScrollTrigger(el: ElementRef<HTMLElement> | undefined) {
    if (el && this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver.observe(el.nativeElement);
    }
  }
  private headerObserver?: IntersectionObserver;
  private scrollObserver?: IntersectionObserver;

  private readonly postsService = inject(FeedPostsService);
  private readonly userService = inject(UsersService);
  private readonly categoryService = inject(CategoriesService);
  private readonly route = inject(ActivatedRoute);
  private readonly localeService = inject(LocaleService);
  private readonly destroyRef = inject(DestroyRef);

  query = '';
  tab: 'top' | 'posts' | 'publications' | 'people' = 'top';

  // Results
  topPosts: Post[] = [];
  featuredPeople: User[] = [];
  featuredPublications: Category[] = [];

  posts: Post[] = [];
  people: User[] = [];
  publications: Category[] = [];

  loading = false;
  error = '';
  
  // Pagination for posts tab
  page = 1;
  totalPages = 1;
  loadingMore = false;
  
  selectedCategory?: Category;

  private readonly filterSubject = new BehaviorSubject<{query: string, tab: string, category?: string, lang: string}>({
    query: '',
    tab: 'top',
    lang: this.localeService.current(),
  });
  private readonly loadMoreSubject = new Subject<{ page: number }>();
  private searchSubscription?: Subscription;

  constructor() {
    effect(() => {
      const lang = this.localeService.current();
      untracked(() => this.filterSubject.next({ ...this.filterSubject.value, lang }));
    });
  }

  ngAfterViewInit() {
    if (this.stickyHeaderRef) {
      const sentinel = document.createElement('div');
      this.stickyHeaderRef.nativeElement.parentElement?.insertBefore(
        sentinel, this.stickyHeaderRef.nativeElement
      );
      this.headerObserver = new IntersectionObserver(
        ([entry]) => {
          this.stickyHeaderRef.nativeElement.classList.toggle('is-stuck', !entry.isIntersecting);
        },
        { threshold: 1 }
      );
      this.headerObserver.observe(sentinel);
    }
    
    // Setup Infinite Scroll Observer
    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.loading && !this.loadingMore) {
          this.loadMore();
        }
      },
      { rootMargin: '200px' }
    );
  }

  ngOnInit(): void {
    // Fix: switchMap để cancel nested subscribe khi category slug thay đổi từ URL
    this.route.queryParamMap.pipe(
      switchMap(params => {
        const catSlug = params.get('category');
        if (!catSlug) return of(null);
        return this.categoryService.findBySlug(catSlug).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(found => {
      if (found) {
        this.selectedCategory = found;
        this.tab = 'posts';
        this.emitFilters(found.slug);
      }
    });

    this.searchSubscription = this.filterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.query === curr.query
        && prev.tab === curr.tab
        && prev.category === curr.category
        && prev.lang === curr.lang),
      tap(() => {
        this.loading = true;
        this.error = '';
        this.page = 1;
      }),
      switchMap(({ query, tab, category, lang }) => {
        const q = query.trim().toLowerCase();
        
        if (tab === 'top') {
          return forkJoin({
            posts: this.postsService.list({ q, category, lang, limit: 10, sort: 'trending' }).pipe(map(res => res.items)),
            people: this.userService.getRecommended(q, 2, 1).pipe(map(res => res.items)),
            pubs: this.categoryService.findAll(q, lang, 2)
          }).pipe(map(res => ({ tab, data: res })));
        } else if (tab === 'posts') {
          return this.postsService.list({ q, category, lang, limit: 20, sort: 'trending', page: 1 }).pipe(
            map(res => ({ tab, data: res }))
          );
        } else if (tab === 'people') {
          return this.userService.getRecommended(q, 20, 1).pipe(
            map(res => ({ tab, data: res }))
          );
        } else if (tab === 'publications') {
          return this.categoryService.findAll(q, lang).pipe(
            map(res => ({ tab, data: res }))
          );
        }
        return of(null);
      }),
      catchError(() => {
        this.handleError();
        return of(null);
      })
    ).subscribe((result: any) => {
      if (!result) return;
      this.loading = false;
      const { tab, data } = result;

      if (tab === 'top') {
        this.topPosts = data.posts;
        this.featuredPeople = data.people;
        this.featuredPublications = data.pubs;
      } else if (tab === 'posts') {
        this.posts = data.items;
        this.totalPages = data.meta.totalPages;
      } else if (tab === 'people') {
        this.people = data.items;
        this.totalPages = data.meta.totalPages;
      } else if (tab === 'publications') {
        this.publications = data;
      }
    });

    // Fix: loadMore dùng switchMap thay vì subscribe trực tiếp
    // switchMap tự cancel request trang cũ nếu user scroll nhanh
    this.loadMoreSubject.pipe(
      debounceTime(300),
      switchMap(({ page }) => {
        this.loadingMore = true;
        const q = this.query.trim().toLowerCase();
        if (this.tab === 'posts') {
          return this.postsService.list({
            q,
            category: this.selectedCategory?.slug,
            lang: this.localeService.current(),
            limit: 20, sort: 'trending', page,
          }).pipe(map(res => ({ kind: 'posts' as const, res })));
        } else if (this.tab === 'people') {
          return this.userService.getRecommended(q, 20, page).pipe(
            map(res => ({ kind: 'people' as const, res }))
          );
        }
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef),
      catchError(() => { this.loadingMore = false; return of(null); })
    ).subscribe((result) => {
      if (!result) { this.loadingMore = false; return; }
      if (result.kind === 'posts') {
        this.posts = [...this.posts, ...result.res.items];
        this.totalPages = result.res.meta.totalPages;
      } else if (result.kind === 'people') {
        this.people = [...this.people, ...result.res.items];
        this.totalPages = result.res.meta.totalPages;
      }
      this.loadingMore = false;
    });
  }

  ngOnDestroy(): void {
    this.headerObserver?.disconnect();
    this.scrollObserver?.disconnect();
    this.searchSubscription?.unsubscribe();
  }

  loadMore(): void {
    if ((this.tab !== 'posts' && this.tab !== 'people') || this.page >= this.totalPages || this.loadingMore) return;
    this.loadingMore = true;
    this.page++;
    this.loadMoreSubject.next({ page: this.page });
  }

  updateQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.emitFilters(this.selectedCategory?.slug);
  }

  clearQuery(): void {
    this.query = '';
    this.emitFilters(this.selectedCategory?.slug);
  }

  setTab(tab: 'top' | 'posts' | 'publications' | 'people'): void {
    if (this.tab !== tab) {
      this.tab = tab;
      this.emitFilters(this.selectedCategory?.slug);
    }
  }

  selectCategory(cat: Category): void {
    this.selectedCategory = cat;
    this.tab = 'posts';
    this.emitFilters(this.selectedCategory.slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearCategory(): void {
    this.selectedCategory = undefined;
    this.emitFilters();
  }
  
  translateCategoryName(cat: Category): string {
    return translateCategory(cat, this.localeService.current());
  }

  private emitFilters(category?: string): void {
    this.filterSubject.next({
      query: this.query,
      tab: this.tab,
      category,
      lang: this.localeService.current(),
    });
  }

  private handleError(): void {
    this.error = 'Unable to load explore data.';
    this.loading = false;
  }
}
