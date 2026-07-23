import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { SubscriptionsService } from '../../core/services/subscriptions.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { AppSidebarComponent } from '../../shared/components/app-sidebar.component';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [AppSidebarComponent],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SubscriptionsComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);
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
          const source = post.translations.find((item: any) => item.languageId === post.originalLanguageId) ?? post.translations[0];
          return {
            id: post.id,
            authorId: post.author.id,
            author: post.author.displayName || post.author.username,
            title: source?.title || 'Untitled',
            summary: source?.summary || '',
            time: new Date(post.publishedAt || post.updatedAt).toLocaleDateString(),
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
interface SubscriptionPostView { id: string; authorId: string; author: string; title: string; summary: string; time: string; }
