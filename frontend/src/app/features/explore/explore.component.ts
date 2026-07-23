import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { PageShellService } from '../../core/ui/page-shell.service';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './explore.component.html',
})
export class ExploreComponent implements OnInit, OnDestroy {
  private readonly ui = inject(PageShellService);
  private readonly postsService = inject(FeedPostsService);

  query = '';
  tab = 'top';
  results: ExploreResult[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.ui.mount('Lingora - Explore');
    this.postsService.list({ limit: 50 }).subscribe({
      next: response => {
        const postResults: ExploreResult[] = response.items.map(post => {
          const source = post.translations.find(item => item.languageCode === post.originalLanguage) ?? post.translations[0];
          return {
            type: 'posts',
            title: source?.title || 'Untitled',
            subtitle: `${post.author.name || post.author.handle} · Published post`,
            icon: 'bi bi-file-text',
            href: `/post-detail?id=${post.id}`,
          };
        });
        const peopleResults: ExploreResult[] = [...new Map(response.items.map(post => [post.author.id, post.author])).values()].map(author => ({
          type: 'people',
          title: author.name || author.handle,
          subtitle: author.bio || `@${author.handle}`,
          icon: 'bi bi-person',
          href: `/profile?id=${author.id}`,
        }));
        this.results = [...postResults, ...peopleResults];
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load explore data from the database.';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  get visibleResults(): ExploreResult[] {
    const query = this.query.trim().toLowerCase();
    return this.results.filter(result =>
      (this.tab === 'top' || result.type === this.tab) &&
      (!query || `${result.title} ${result.subtitle}`.toLowerCase().includes(query)),
    );
  }

  updateQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }
}

interface ExploreResult {
  type: 'posts' | 'people';
  title: string;
  subtitle: string;
  icon: string;
  href: string;
}
