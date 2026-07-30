import { Component, inject, ViewChild, ElementRef, effect, untracked } from '@angular/core';
import { SubscriptionsService } from './services/subscriptions.service';
import { AuthorTooltipComponent } from '../users/components/author-tooltip/author-tooltip.component';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { FormsModule } from '@angular/forms';
import { Post } from '../posts/models/post.model';
import { SubscribeButtonComponent } from './components/subscribe-button/subscribe-button.component';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LocaleService } from '../../core/locale/locale.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [AuthorTooltipComponent, PostCardComponent, FormsModule, SubscribeButtonComponent, AssetImageDirective, TranslatePipe],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionsComponent {
  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly localeService = inject(LocaleService);

  tab: 'all' | 'manage' = 'all';
  authorFilter = '';
  manageSearchQuery = '';
  authors: SubscriptionAuthorView[] = [];
  posts: Post[] = [];
  loading = true;
  error = '';

  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      const language = this.localeService.current();
      untracked(() => this.loadSubscriptions(language));
    });
  }

  get visiblePosts(): Post[] {
    return this.posts.filter(post => !this.authorFilter || post.author.name === this.authorFilter || post.author.handle === this.authorFilter);
  }

  get visibleManageAuthors(): SubscriptionAuthorView[] {
    const q = this.normalizeString(this.manageSearchQuery.trim());
    return this.authors.filter(a => !q || this.normalizeString(a.name).includes(q));
  }

  private normalizeString(str: string): string {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase() : '';
  }

  scrollCarousel(direction: 'left' | 'right'): void {
    if (this.carousel) {
      const scrollAmount = 300; // Adjust scroll distance as needed
      this.carousel.nativeElement.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  selectAuthor(name: string): void {
    this.authorFilter = name;
    if (this.tab !== 'all') {
      this.tab = 'all';
    }
  }

  private loadSubscriptions(language: string): void {
    this.loading = true;
    this.subscriptionsService.list(language).subscribe({
      next: data => {
        this.authors = data.authors.map(author => ({
          id: author.id,
          username: author.username,
          name: author.displayName || author.username,
          role: author.bio || `@${author.username}`,
          avatar: author.avatarUrl || '/assets/images/default-avatar.svg',
        }));
        this.posts = data.posts;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load subscriptions from the database.';
        this.loading = false;
      },
    });
  }
}

interface SubscriptionAuthorView { id: string; username: string; name: string; role: string; avatar: string; }
