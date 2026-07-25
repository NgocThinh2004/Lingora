import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { SubscriptionsService } from './services/subscriptions.service';
import { AuthorTooltipComponent } from '../../shared/components/author-tooltip/author-tooltip.component';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { FormsModule } from '@angular/forms';
import { Post } from '../posts/models/post.model';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [AuthorTooltipComponent, PostCardComponent, FormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionsComponent implements OnInit {
  private readonly subscriptionsService = inject(SubscriptionsService);

  tab: 'all' | 'manage' = 'all';
  authorFilter = '';
  manageSearchQuery = '';
  authors: SubscriptionAuthorView[] = [];
  posts: Post[] = [];
  loading = true;
  error = '';

  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    this.loadSubscriptions();
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

  toggleSubscription(author: SubscriptionAuthorView): void {
    if (author.isUnfollowed) {
      this.subscriptionsService.subscribe(author.id).subscribe({
        next: () => {
          author.isUnfollowed = false;
        },
        error: () => this.error = 'Unable to update this subscription.',
      });
    } else {
      this.subscriptionsService.unsubscribe(author.id).subscribe({
        next: () => {
          author.isUnfollowed = true;
          if (this.authorFilter === author.name) this.authorFilter = '';
        },
        error: () => this.error = 'Unable to update this subscription.',
      });
    }
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

  private loadSubscriptions(): void {
    this.subscriptionsService.list().subscribe({
      next: data => {
        this.authors = data.authors.map(author => ({
          id: author.id,
          username: author.username,
          name: author.displayName || author.username,
          role: author.bio || `@${author.username}`,
          avatar: author.avatarUrl || '/assets/images/lingora-mark.svg',
          isUnfollowed: false
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

interface SubscriptionAuthorView { id: string; username: string; name: string; role: string; avatar: string; isUnfollowed: boolean; }
