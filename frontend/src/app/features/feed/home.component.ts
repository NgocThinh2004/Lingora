import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);

  search = '';
  category = 'all';
  readonly posts = [
    {
      id: 1,
      author: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80',
      category: 'Artificial Intelligence',
      title: 'How AI is changing the way we build software',
      summary: 'A practical look at modern AI-assisted workflows and what they mean for product teams.',
      timestamp: '2 hours ago', likes: 128, comments: 24, views: 1840, liked: false,
    },
    {
      id: 2,
      author: 'Thái Dương',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=80&h=80',
      category: 'Backend Engineering',
      title: 'Designing services that stay simple as they scale',
      summary: 'Patterns for service boundaries, queues, observability, and database ownership in growing systems.',
      timestamp: 'Yesterday', likes: 94, comments: 18, views: 1260, liked: false,
    },
    {
      id: 3,
      author: 'Hoàng Anh',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80&h=80',
      category: 'Design',
      title: 'Small interface decisions with a large impact',
      summary: 'Why consistency, readable hierarchy, and clear feedback matter more than decorative complexity.',
      timestamp: '3 days ago', likes: 76, comments: 11, views: 980, liked: false,
    },
  ];

  ngOnInit(): void {
    this.ui.mount('Lingora - Multilingual AI-Translated Feed');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  get visiblePosts() {
    const query = this.search.trim().toLowerCase();
    return this.posts.filter((post) =>
      (this.category === 'all' || post.category === this.category) &&
      (!query || `${post.title} ${post.summary} ${post.author} ${post.category}`.toLowerCase().includes(query)),
    );
  }

  setSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }

  selectCategory(event: Event, category: string): void {
    event.preventDefault();
    this.category = category;
  }

  toggleLike(post: (typeof this.posts)[number]): void {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
  }
}
