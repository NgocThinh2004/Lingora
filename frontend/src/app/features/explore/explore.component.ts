import { Component, OnDestroy, OnInit, AfterViewInit, AfterViewChecked, ElementRef, ViewChild, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, debounceTime, distinctUntilChanged, Subscription, forkJoin, map, switchMap, tap, of, catchError } from 'rxjs';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { UsersService } from '../users/services/users.service';
import { CategoriesService } from '../categories/services/categories.service';
import { translateCategory, Category } from '../categories/models/category.model';
import { CommonModule } from '@angular/common';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { FormsModule } from '@angular/forms';
import { AuthorTooltipComponent } from '../../shared/components/author-tooltip/author-tooltip.component';
import { SubscribeButtonComponent } from '../../shared/components/subscribe-button/subscribe-button.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, FormsModule, AuthorTooltipComponent, SubscribeButtonComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss'
})
export class ExploreComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  @ViewChild('stickyHeader') stickyHeaderRef!: ElementRef<HTMLElement>;
  @ViewChild('infiniteScrollTrigger') infiniteScrollTrigger?: ElementRef<HTMLElement>;
  private headerObserver?: IntersectionObserver;
  private scrollObserver?: IntersectionObserver;

  private readonly postsService = inject(FeedPostsService);
  private readonly userService = inject(UsersService);
  private readonly categoryService = inject(CategoriesService);
  private readonly route = inject(ActivatedRoute);

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

  private readonly filterSubject = new BehaviorSubject<{query: string, tab: string, category?: string}>({query: '', tab: 'top'});
  private searchSubscription?: Subscription;

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
          this.loadMorePosts();
        }
      },
      { rootMargin: '200px' }
    );
  }

  // Bind observer to the trigger element when it appears in the DOM
  ngAfterViewChecked() {
    if (this.infiniteScrollTrigger?.nativeElement && this.scrollObserver) {
      this.scrollObserver.observe(this.infiniteScrollTrigger.nativeElement);
    }
  }
  ngOnInit(): void {
    // Check if category is passed via URL query params
    this.route.queryParamMap.subscribe(params => {
      const catSlug = params.get('category');
      if (catSlug) {
        this.categoryService.findAll().subscribe(cats => {
          const found = cats.find(c => c.slug === catSlug);
          if (found) {
            this.selectedCategory = found;
            this.tab = 'posts';
            this.filterSubject.next({ query: this.query, tab: this.tab, category: found.slug });
          }
        });
      }
    });

    this.searchSubscription = this.filterSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.query === curr.query && prev.tab === curr.tab && prev.category === curr.category),
      tap(() => {
        this.loading = true;
        this.error = '';
        this.page = 1;
      }),
      switchMap(({ query, tab, category }) => {
        const q = query.trim().toLowerCase();
        
        if (tab === 'top') {
          return forkJoin({
            posts: this.postsService.list({ q, category, limit: 10, sort: 'trending' }).pipe(map(res => res.items)),
            people: this.userService.getRecommended().pipe(
              map(users => q ? users.filter(u => u.name?.toLowerCase().includes(q) || u.handle?.toLowerCase().includes(q)) : users)
            ),
            pubs: this.categoryService.findAll()
          }).pipe(map(res => ({ tab, q, data: res })));
        } else if (tab === 'posts') {
          return this.postsService.list({ q, category, limit: 20, sort: 'trending', page: 1 }).pipe(
            map(res => ({ tab, q, data: res }))
          );
        } else if (tab === 'people') {
          return this.userService.getRecommended().pipe(
            map(users => q ? users.filter(u => u.name?.toLowerCase().includes(q) || u.handle?.toLowerCase().includes(q)) : users),
            map(res => ({ tab, q, data: res }))
          );
        } else if (tab === 'publications') {
          return this.categoryService.findAll().pipe(
            map(categories => q ? categories.filter(c => translateCategory(c, 'vi').toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)) : categories),
            map(res => ({ tab, q, data: res }))
          );
        }
        return of(null);
      }),
      catchError(err => {
        this.handleError();
        return of(null);
      })
    ).subscribe((result: any) => {
      if (!result) return;
      this.loading = false;
      const { tab, q, data } = result;

      if (tab === 'top') {
        this.topPosts = data.posts;
        this.featuredPeople = data.people.slice(0, 2);
        let filteredPubs = data.pubs;
        if (q) {
          filteredPubs = filteredPubs.filter((c: any) => 
            translateCategory(c, 'vi').toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
          );
        }
        this.featuredPublications = filteredPubs.slice(0, 2);
      } else if (tab === 'posts') {
        this.posts = data.items;
        this.totalPages = data.meta.totalPages;
      } else if (tab === 'people') {
        this.people = data;
      } else if (tab === 'publications') {
        this.publications = data;
      }
    });
  }

  ngOnDestroy(): void {
    this.headerObserver?.disconnect();
    this.scrollObserver?.disconnect();
    this.searchSubscription?.unsubscribe();
  }

  loadMorePosts(): void {
    if (this.tab !== 'posts' || this.page >= this.totalPages) return;
    
    this.loadingMore = true;
    const q = this.query.trim().toLowerCase();
    this.page++;

    this.postsService.list({ q, category: this.selectedCategory?.slug, limit: 20, sort: 'trending', page: this.page }).subscribe({
      next: (res) => {
        this.posts = [...this.posts, ...res.items];
        this.totalPages = res.meta.totalPages;
        this.loadingMore = false;
      },
      error: () => {
        this.loadingMore = false;
      }
    });
  }

  updateQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.filterSubject.next({ query: this.query, tab: this.tab, category: this.selectedCategory?.slug });
  }

  clearQuery(): void {
    this.query = '';
    this.filterSubject.next({ query: this.query, tab: this.tab, category: this.selectedCategory?.slug });
  }

  setTab(tab: 'top' | 'posts' | 'publications' | 'people'): void {
    if (this.tab !== tab) {
      this.tab = tab;
      this.filterSubject.next({ query: this.query, tab: this.tab, category: this.selectedCategory?.slug });
    }
  }

  selectCategory(cat: Category): void {
    this.selectedCategory = cat;
    this.tab = 'posts';
    this.filterSubject.next({ query: this.query, tab: this.tab, category: this.selectedCategory.slug });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearCategory(): void {
    this.selectedCategory = undefined;
    this.filterSubject.next({ query: this.query, tab: this.tab });
  }
  
  translateCategoryName(cat: Category): string {
    return translateCategory(cat, 'vi');
  }

  private handleError(): void {
    this.error = 'Unable to load explore data.';
    this.loading = false;
  }
}
