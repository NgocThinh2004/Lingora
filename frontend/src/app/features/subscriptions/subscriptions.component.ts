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
import { BehaviorSubject, Subscription, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';

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

  tab: 'all' | 'manage' = 'all';
  authorFilter = '';
  manageSearchQuery = '';
  
  authors: SubscriptionAuthorView[] = [];
  posts: Post[] = [];
  
  loading = true;
  loadingAuthors = false;
  loadingFeed = false;
  
  error = '';
  
  private feedSubject = new BehaviorSubject<{ author: string; lang: string; page: number }>({ author: '', lang: '', page: 1 });
  private authorsSubject = new BehaviorSubject<{ q: string; page: number }>({ q: '', page: 1 });
  private subscriptions: Subscription = new Subscription();

  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      const language = this.localeService.current();
      untracked(() => {
        this.feedSubject.next({ ...this.feedSubject.value, lang: language, page: 1 });
      });
    });
  }

  ngOnInit(): void {
    // Initial parallel load
    this.loading = true;
    const lang = this.localeService.current();
    this.subscriptions.add(
      forkJoin({
        feed: this.subscriptionsService.getFeed('', lang, 1, 20),
        authors: this.subscriptionsService.following('', 1, 50)
      }).subscribe({
        next: ({ feed, authors }) => {
          this.posts = feed.items;
          this.authors = this.mapAuthors(authors.items);
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load subscriptions from the database.';
          this.loading = false;
        }
      })
    );

    this.subscriptions.add(
      this.feedSubject.pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.author === b.author && a.lang === b.lang && a.page === b.page)
      ).subscribe(filter => {
        if (!this.loading) this.loadFeed(filter);
      })
    );

    this.subscriptions.add(
      this.authorsSubject.pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.q === b.q && a.page === b.page)
      ).subscribe(filter => {
        if (!this.loading) this.loadAuthors(filter);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSearchAuthors(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.manageSearchQuery = q;
    this.authorsSubject.next({ q, page: 1 });
  }

  scrollCarousel(direction: 'left' | 'right'): void {
    if (this.carousel) {
      const scrollAmount = 300;
      this.carousel.nativeElement.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  selectAuthor(name: string, authorId: string): void {
    this.authorFilter = this.authorFilter === name ? '' : name;
    const authorFilterId = this.authorFilter ? authorId : '';
    this.feedSubject.next({ ...this.feedSubject.value, author: authorFilterId, page: 1 });
    
    if (this.tab !== 'all') {
      this.tab = 'all';
    }
  }

  private loadFeed(filter: { author: string; lang: string; page: number }): void {
    this.loadingFeed = true;
    this.subscriptionsService.getFeed(filter.author, filter.lang, filter.page, 20).subscribe({
      next: data => {
        this.posts = filter.page === 1 ? data.items : [...this.posts, ...data.items];
        this.loadingFeed = false;
      },
      error: () => {
        this.loadingFeed = false;
      }
    });
  }

  private loadAuthors(filter: { q: string; page: number }): void {
    this.loadingAuthors = true;
    this.subscriptionsService.following(filter.q, filter.page, 50).subscribe({
      next: data => {
        this.authors = filter.page === 1 ? this.mapAuthors(data.items) : [...this.authors, ...this.mapAuthors(data.items)];
        this.loadingAuthors = false;
      },
      error: () => {
        this.loadingAuthors = false;
      }
    });
  }

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
