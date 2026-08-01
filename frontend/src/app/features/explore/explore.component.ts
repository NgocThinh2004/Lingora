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

/**
 * ExploreComponent - Thành phần quản lý chức năng tìm kiếm và khám phá
 * 
 * Cho phép tìm kiếm bài viết, người dùng, ấn phẩm (danh mục) theo từ khóa,
 * và hiển thị kết quả phân chia theo các tab khác nhau.
 */
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, FormsModule, AuthorTooltipComponent, SubscribeButtonComponent, AssetImageDirective, TranslatePipe],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss'
})
export class ExploreComponent implements OnInit, OnDestroy, AfterViewInit {
  // ══════════════════════════════════════════════════════
  // Global State / DB Field Mapping / RxJS Pipeline
  // ══════════════════════════════════════════════════════
  // GIẢI THÍCH SIGNAL STATES VÀ DB FIELD MAPPING:
  // - posts: Mảng chứa bài viết (Post[]). 
  //   DB Mapping: Dữ liệu được gộp từ các bảng `posts`, `post_translations`, `users`, `categories`.
  // - page: Trang hiện tại. Map tới query param phân trang của API.
  // - totalPages: Tổng số trang, do Backend trả về.
  // - loading: State đang tải khi gọi API lần đầu (page = 1).
  // - loadingMore: State đang tải thêm khi cuộn (page > 1).
  // ══════════════════════════════════════════════════════

  @ViewChild('stickyHeader') stickyHeaderRef!: ElementRef<HTMLElement>;

  // ══════════════════════════════════════════════════════
  // CƠ CHẾ INTERSECTION OBSERVER (INFINITE SCROLL)
  // ══════════════════════════════════════════════════════
  // Tại sao dùng IntersectionObserver?
  // - Trình duyệt tự xử lý ở background thread, không block main thread như việc dùng sự kiện scroll truyền thống.
  // - rootMargin: '200px' -> kích hoạt tải dữ liệu trước khi thực sự chạm đáy 200px (pre-fetch), mang lại trải nghiệm mượt mà.
  // ══════════════════════════════════════════════════════
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

  // Kết quả theo tab 'top'
  topPosts: Post[] = [];
  featuredPeople: User[] = [];
  featuredPublications: Category[] = [];

  // Kết quả phân trang cho tab cụ thể
  posts: Post[] = [];
  people: User[] = [];
  publications: Category[] = [];

  loading = false;
  error = '';
  
  // Biến quản lý phân trang
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

  hasInitialized = false;

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
    
    // Thiết lập IntersectionObserver cho Infinite Scroll
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
    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      const urlQuery = params.get('query') || '';
      if (urlQuery !== this.query) {
        this.query = urlQuery;
      }

      const catSlug = params.get('category');
      if (catSlug) {
        if (!this.selectedCategory || this.selectedCategory.slug !== catSlug) {
          this.categoryService.findBySlug(catSlug).subscribe({
            next: found => {
              if (found) {
                this.selectedCategory = found;
                this.tab = 'posts';
                this.emitFilters(found.slug);
              } else {
                this.selectedCategory = undefined;
                this.emitFilters();
              }
            },
            error: () => {
              this.selectedCategory = undefined;
              this.emitFilters();
            }
          });
        } else {
          this.emitFilters(this.selectedCategory.slug);
        }
      } else {
        this.selectedCategory = undefined;
        this.emitFilters();
      }
    });

    // ══════════════════════════════════════════════════════
    // HÀNH ĐỘNG: USER CHUYỂN TAB / GÕ SEARCH
    // ══════════════════════════════════════════════════════
    // GIẢI THÍCH LUỒNG RxJS:
    // 1. Khi người dùng gõ phím vào ô Search hoặc bấm chuyển Tab, filterSubject sẽ nhận 
    //    được giá trị mới (query, tab, category, lang).
    // 2. debounceTime(300): Chờ 300ms sau lần gõ phím cuối cùng mới đẩy dữ liệu đi. 
    //    Giúp giảm tải server, tránh việc gọi API liên tục cho mỗi chữ cái gõ vào.
    // 3. distinctUntilChanged: Nếu dữ liệu search/tab không thay đổi so với lần gọi trước,
    //    thì sẽ không gọi API (ví dụ gõ "a" rồi xóa đi quá nhanh trong 300ms).
    // 4. switchMap: RẤT QUAN TRỌNG. Nếu có request cũ đang gọi mà chưa phản hồi, 
    //    nhưng user lại gõ thêm hoặc chuyển tab mới, switchMap sẽ HỦY (cancel) request cũ.
    //    Chỉ lấy kết quả của request mới nhất, ngăn ngừa Race Condition (lỗi sai lệch UI).
    // ══════════════════════════════════════════════════════
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
        
        // GIẢI THÍCH LƯỢNG DỮ LIỆU ĐƯỢC TẢI LÊN MÀN HÌNH THEO TỪNG TAB:
        if (tab === 'top') {
          // Tab "Top" (Nổi bật): Chỉ lấy số lượng ít để hiển thị tổng quan.
          // - posts: limit: 10 (Lấy tối đa 10 bài viết trending)
          // - people: 2 người dùng nổi bật
          // - pubs: 2 danh mục/ấn phẩm nổi bật
          return forkJoin({
            posts: this.postsService.list({ q, category, lang, limit: 10, sort: 'trending' }).pipe(map(res => res.items)),
            people: this.userService.getRecommended(q, 2, 1).pipe(map(res => res.items)),
            pubs: this.categoryService.findAll(q, lang, 2)
          }).pipe(map(res => ({ tab, data: res })));
        } else if (tab === 'posts') {
          // Tab "Bài viết": Chuyên hiển thị danh sách bài viết nên lấy số lượng nhiều hơn (limit: 20).
          // Lần đầu tải sẽ có 20 bài trên màn hình. Mỗi lần cuộn sẽ nối thêm 20 bài mới (20 -> 40 -> 60).
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
      this.hasInitialized = true; 

      // ══════════════════════════════════════════════════════
      // PHÂN TÁCH LOGIC XỬ LÝ KẾT QUẢ THEO TRANG (PAGE === 1)
      // ══════════════════════════════════════════════════════
      // Vì đây là kết quả của search hoặc đổi tab, nó mang ý nghĩa tải trang 1 (page === 1)
      // nên chúng ta sẽ overwrite (ghi đè) lại toàn bộ danh sách hiện tại.
      // ══════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════
    // HÀNH ĐỘNG: CUỘN TRANG (INFINITE SCROLL)
    // ══════════════════════════════════════════════════════
    // GIẢI THÍCH LUỒNG RxJS VÀ UPDATE UI:
    // 1. Khi người dùng cuộn xuống đáy trang, IntersectionObserver (cấu hình ở ngAfterViewInit)
    //    sẽ phát hiện và gọi hàm loadMore(). Hàm này tăng số page và đẩy vào loadMoreSubject.
    // 2. debounceTime(300): Tránh việc event cuộn (scroll) bắn ra quá nhiều lần sát nhau.
    // 3. switchMap: Hủy các request tải thêm (load more) cũ nếu cuộn xảy ra liên tục, 
    //    chỉ gọi API (qua postsService.list hoặc getRecommended) cho yêu cầu mới nhất.
    // 4. Update UI array (bên trong subscribe):
    //    Khi nhận kết quả mới từ API, chúng ta KHÔNG ghi đè toàn bộ mảng dữ liệu hiện tại.
    //    Thay vào đó, dùng cú pháp Spread Operator ([...old, ...new]) để gộp/nối dữ liệu 
    //    mới vào cuối danh sách hiện tại. Qua đó UI sẽ tự động render tiếp dữ liệu mới.
    // ══════════════════════════════════════════════════════
    this.loadMoreSubject.pipe(
      debounceTime(300),
      switchMap(({ page }) => {
        this.loadingMore = true;
        const q = this.query.trim().toLowerCase();
        if (this.tab === 'posts') {
          // Khi cuộn xuống ở Tab Bài viết, gọi API lấy tiếp ĐÚNG 20 BÀI VIẾT của trang kế tiếp (page + 1)
          // Sau đó nối 20 bài này vào đuôi danh sách hiện tại trên giao diện.
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
      
      // ══════════════════════════════════════════════════════
      // PHÂN TÁCH LOGIC XỬ LÝ KẾT QUẢ THEO TRANG (PAGE > 1)
      // ══════════════════════════════════════════════════════
      // - page > 1: Khi người dùng cuộn xuống (infinite scroll), 
      // append (nối) mảng mới vào mảng cũ bằng spread operator.
      // ══════════════════════════════════════════════════════
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

  isCurrentTabEmpty(): boolean {
    if (!this.hasInitialized) return false;

    switch (this.tab) {
      case 'top':
        return this.topPosts.length === 0 && this.featuredPeople.length === 0 && this.featuredPublications.length === 0;
      case 'posts':
        return this.posts.length === 0;
      case 'people':
        return this.people.length === 0;
      case 'publications':
        return this.publications.length === 0;
      default:
        return true;
    }
  }
}
