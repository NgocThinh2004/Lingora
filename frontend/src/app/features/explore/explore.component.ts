import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { PostsService } from '../../core/services/posts.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { AppSidebarComponent } from '../../shared/components/app-sidebar.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [AppSidebarComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ExploreComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);
  private readonly postsService = inject(PostsService);

  query = '';
  tab = 'top';
  results: ExploreResult[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.ui.mount('Lingora - Explore');
    this.postsService.listPublicPosts({ limit: 50 }).subscribe({
      next: response => {
        const postResults: ExploreResult[] = response.data.map(post => {
          const source = post.translations.find(item => item.languageId === post.originalLanguageId) ?? post.translations[0];
          return {
            type: 'posts',
            title: source?.title || 'Untitled',
            subtitle: `${post.author.displayName || post.author.username} · ${source?.summary || 'Published post'}`,
            icon: 'bi bi-file-text',
            href: `/post-detail?id=${post.id}`,
          };
        });
        const peopleResults: ExploreResult[] = [...new Map(response.data.map(post => [post.author.id, post.author])).values()].map(author => ({
          type: 'people',
          title: author.displayName || author.username,
          subtitle: author.bio || `@${author.username}`,
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
