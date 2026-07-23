import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { PublicPost } from '../../core/models/post.model';
import { PostsService } from '../posts/services/posts.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { AppSidebarComponent } from '../../shared/components/app-sidebar.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AppSidebarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);
  private readonly postsService = inject(PostsService);

  search = '';
  category = 'all';
  posts: FeedPost[] = [];
  loading = true;
  error = '';
  private categoryLabels = new Map<number, string>();

  ngOnInit(): void {
    this.ui.mount('Lingora - Multilingual AI-Translated Feed');
    this.postsService.getPostOptions().subscribe({
      next: options => {
        this.categoryLabels = new Map(options.categories.map(category => [category.id, category.label]));
        this.posts.forEach(post => post.category = this.categoryName(post.categoryId));
      },
    });
    this.loadPosts();
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  get visiblePosts(): FeedPost[] {
    const query = this.search.trim().toLowerCase();
    return this.posts.filter(post =>
      (this.category === 'all' || post.category === this.category) &&
      (!query || `${post.title} ${post.summary} ${post.author} ${post.category}`.toLowerCase().includes(query)),
    );
  }

  get recommendedAuthors() {
    return [...new Map(this.posts.map(post => [post.authorId, {
      id: post.authorId,
      name: post.author,
      avatar: post.avatar,
    }])).values()].slice(0, 3);
  }

  get categories(): string[] {
    return [...new Set(this.posts.map(post => post.category))];
  }

  setSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }

  selectCategory(event: Event, category: string): void {
    event.preventDefault();
    this.category = category;
  }

  toggleLike(post: FeedPost): void {
    post.liked = !post.liked;
  }

  private loadPosts(): void {
    this.postsService.listPublicPosts({ limit: 50 }).subscribe({
      next: response => {
        this.posts = response.data.map(post => this.toFeedPost(post));
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load posts from the database.';
        this.loading = false;
      },
    });
  }

  private toFeedPost(post: PublicPost): FeedPost {
    const source = post.translations.find(item => item.languageId === post.originalLanguageId) ?? post.translations[0];
    return {
      id: post.id,
      categoryId: post.categoryId,
      authorId: post.author.id,
      author: post.author.displayName || post.author.username,
      avatar: post.author.avatarUrl || '/assets/images/lingora-mark.svg',
      category: this.categoryName(post.categoryId),
      title: source?.title || 'Untitled',
      summary: source?.summary || this.toPlainText(source?.content || '').slice(0, 220),
      timestamp: new Date(post.publishedAt || post.updatedAt).toLocaleDateString(),
      likes: post.likeCount,
      comments: post.commentCount,
      views: post.viewCount,
      liked: false,
    };
  }

  private toPlainText(html: string): string {
    const element = document.createElement('div');
    element.innerHTML = html;
    return (element.textContent || '').trim();
  }

  private categoryName(categoryId: number | null): string {
    return categoryId ? this.categoryLabels.get(categoryId) || `Category ${categoryId}` : 'Uncategorized';
  }
}

interface FeedPost {
  id: string;
  categoryId: number | null;
  authorId: string;
  author: string;
  avatar: string;
  category: string;
  title: string;
  summary: string;
  timestamp: string;
  likes: number;
  comments: number;
  views: number;
  liked: boolean;
}
