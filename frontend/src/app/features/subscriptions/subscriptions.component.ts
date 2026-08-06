import { Component, inject, ViewChild, ElementRef, effect, untracked, OnInit, OnDestroy } from '@angular/core';
import { SubscriptionsService } from './services/subscriptions.service';
import { AuthorTooltipComponent } from '../users/components/author-tooltip/author-tooltip.component';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { FormsModule } from '@angular/forms';
import { Post } from '../posts/models/post.model';
import { SubscribeButtonComponent } from './components/subscribe-button/subscribe-button.component';
import { SubscriptionAuthorView, SubscriptionAuthor } from './models/subscription.model';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LocaleService } from '../../core/locale/locale.service';
import { BehaviorSubject, Subscription, debounceTime, distinctUntilChanged, switchMap, map, catchError, tap, of } from 'rxjs';

/**
 * SubscriptionsComponent - Quản lý trang theo dõi (Subscriptions)
 * 
 * Component hiển thị danh sách các tác giả mà người dùng đang theo dõi,
 * cũng như danh sách bài viết (feed) từ các tác giả này. 
 * Hỗ trợ chuyển đổi giữa chế độ xem bài viết, tìm kiếm tác giả và lọc bài đăng theo một tác giả cụ thể.
 * 
 * DB: Dữ liệu được fetch từ các bảng `follows` (để biết ai theo dõi ai)
 * và query từ bảng `posts` lọc theo những userId đang follow.
 */
@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [AuthorTooltipComponent, PostCardComponent, FormsModule, SubscribeButtonComponent, AssetImageDirective, TranslatePipe],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionsComponent implements OnInit, OnDestroy {
  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly localeService = inject(LocaleService);

  // 'all' = Xem luồng bài viết, 'manage' = Quản lý danh sách tác giả
  tab: 'all' | 'manage' = 'all';
  authorFilter = '';
  manageSearchQuery = '';
  
  authors: SubscriptionAuthorView[] = [];
  posts: Post[] = [];
  
  loading = true;
  loadingAuthors = false;
  loadingFeed = false;
  
  error = '';
  
  // BehaviorSubject dùng để lưu trữ các trạng thái lọc/tìm kiếm hiện hành 
  // và phát ra sự kiện khi có thay đổi.
  private feedSubject = new BehaviorSubject<{ author: string; lang: string; page: number }>({ author: '', lang: '', page: 1 });
  private authorsSubject = new BehaviorSubject<{ q: string; page: number }>({ q: '', page: 1 });
  private subscriptions: Subscription = new Subscription();

  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  constructor() {
    // Lắng nghe sự kiện đổi ngôn ngữ toàn cục
    effect(() => {
      const language = this.localeService.current();
      untracked(() => {
        // Cập nhật subject, dẫn đến gọi API feed lại theo ngôn ngữ mới
        this.feedSubject.next({ ...this.feedSubject.value, lang: language, page: 1 });
      });
    });
  }

  ngOnInit(): void {
    this.loading = true;
    const lang = this.localeService.current();
    // Cả 2 BehaviorSubject đều có giá trị khởi tạo nên sẽ tự động chạy ngay lần đầu, song song với nhau.
    this.subscriptions.add(
      this.feedSubject.pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.author === b.author && a.lang === b.lang && a.page === b.page),
        tap(() => this.loadingFeed = true),
        switchMap(filter => this.subscriptionsService.getFeed(filter.author, filter.lang, filter.page, 20).pipe(
          map(data => ({ filter, data })),
          catchError(() => {
            this.loadingFeed = false;
            this.loading = false;
            return of(null);
          })
        ))
      ).subscribe(result => {
        if (!result) return;
        const { filter, data } = result;
        this.posts = filter.page === 1 ? data.items : [...this.posts, ...data.items];
        this.loadingFeed = false;
        // Nếu loadAuthors cũng xong thì loading chung sẽ tắt
        if (!this.loadingAuthors) this.loading = false;
      })
    );

    this.subscriptions.add(
      this.authorsSubject.pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.q === b.q && a.page === b.page),
        tap(() => this.loadingAuthors = true),
        switchMap(filter => this.subscriptionsService.following(filter.q, filter.page, 50).pipe(
          map(data => ({ filter, data })),
          catchError(() => {
            this.loadingAuthors = false;
            this.loading = false;
            return of(null);
          })
        ))
      ).subscribe(result => {
        if (!result) return;
        const { filter, data } = result;
        this.authors = filter.page === 1 ? this.mapAuthors(data.items) : [...this.authors, ...this.mapAuthors(data.items)];
        this.loadingAuthors = false;
        // Nếu loadFeed cũng xong thì loading chung sẽ tắt
        if (!this.loadingFeed) this.loading = false;
      })
    );
  }

  ngOnDestroy(): void {
    // Hủy các subsciption để tránh memory leak
    this.subscriptions.unsubscribe();
  }

  // Tìm kiếm tác giả đang theo dõi
  onSearchAuthors(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.manageSearchQuery = q;
    this.authorsSubject.next({ q, page: 1 });
  }

  // Trượt thanh hiển thị tác giả ngang (Carousel)
  scrollCarousel(direction: 'left' | 'right'): void {
    if (this.carousel) {
      const scrollAmount = 300;
      this.carousel.nativeElement.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  // Nhấn vào tác giả trên thanh vòng xoay (Carousel) để lọc feed chỉ xem bài của tác giả đó
  selectAuthor(name: string, authorId: string): void {
    this.authorFilter = this.authorFilter === name ? '' : name; // Nhấn lần nữa để bỏ lọc
    const authorFilterId = this.authorFilter ? authorId : '';
    // Phát dữ liệu lọc mới ra Subject, RXJS sẽ bắt và tự gọi lại API LoadFeed
    this.feedSubject.next({ ...this.feedSubject.value, author: authorFilterId, page: 1 });
    
    // Nếu đang ở tab manage thì tự động chuyển về tab all (Feed)
    if (this.tab !== 'all') {
      this.tab = 'all';
    }
  }

  // Định dạng lại format data trả về từ API sang format View sử dụng ở template
  private mapAuthors(items: SubscriptionAuthor[]): SubscriptionAuthorView[] {
    return items.map(author => ({
      id: author.id,
      username: author.username,
      name: author.displayName || author.username,
      role: author.bio || `@${author.username}`,
      avatar: author.avatarUrl || '/assets/images/default-avatar.svg',
    }));
  }
}
