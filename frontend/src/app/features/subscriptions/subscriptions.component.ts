import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { PageShellService } from '../../core/ui/page-shell.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { AuthorTooltipComponent } from '../../shared/components/author-tooltip/author-tooltip.component';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [AuthorTooltipComponent],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss'
})
export class SubscriptionsComponent implements OnInit, OnDestroy {
  private readonly ui = inject(PageShellService);
  private readonly subscriptionsService = inject(SubscriptionsService);

  tab: 'all' | 'manage' = 'all';
  authorFilter = '';
  authors: SubscriptionAuthorView[] = [];
  posts: SubscriptionPostView[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.ui.mount('Subscriptions - Lingora');
    this.loadSubscriptions();
  }

  ngOnDestroy(): void { this.ui.unmount(); }

  get visiblePosts(): SubscriptionPostView[] {
    return this.posts.filter(post => !this.authorFilter || post.author === this.authorFilter);
  }

  unfollow(name: string): void {
    const author = this.authors.find(item => item.name === name);
    if (!author) return;
    this.subscriptionsService.unsubscribe(author.id).subscribe({
      next: () => {
        this.authors = this.authors.filter(item => item.id !== author.id);
        this.posts = this.posts.filter(post => post.authorId !== author.id);
        if (this.authorFilter === name) this.authorFilter = '';
      },
      error: () => this.error = 'Unable to update this subscription.',
    });
  }

  private loadSubscriptions(): void {
    this.subscriptionsService.list().subscribe({
      next: data => {
        this.authors = data.authors.map(author => ({
          id: author.id,
          name: author.displayName || author.username,
          role: author.bio || `@${author.username}`,
          avatar: author.avatarUrl || '/assets/images/lingora-mark.svg',
        }));
        this.posts = data.posts.map(post => {
          const source = post.translations.find(item => item.languageCode === post.originalLanguage) ?? post.translations[0];
          return {
            id: String(post.id),
            authorId: String(post.author.id),
            author: post.author.name || post.author.handle,
            title: source?.title || 'Untitled',
            time: new Date(post.createdAt).toLocaleDateString(),
          };
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load subscriptions from the database.';
        this.loading = false;
      },
    });
  }
}

interface SubscriptionAuthorView { id: string; name: string; role: string; avatar: string; }
interface SubscriptionPostView { id: string; authorId: string; author: string; title: string; time: string; }
