import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
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

  tab: 'all' | 'manage' = 'all';
  authorFilter = '';
  authors = [
    { name: 'Elena Rostova', role: 'Artificial Intelligence Lead', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80' },
    { name: 'Hồ Quốc Tuấn', role: 'Economics Author', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80' },
    { name: 'Thái Dương', role: 'Tech Lead & Architecture', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=80&h=80' },
  ];
  readonly posts = [
    { id: 1, author: 'Elena Rostova', title: 'How AI is changing the way we build software', summary: 'A practical look at modern AI-assisted workflows.', time: '2 hours ago' },
    { id: 2, author: 'Thái Dương', title: 'Designing services that stay simple as they scale', summary: 'Patterns for clear service boundaries and reliable delivery.', time: 'Yesterday' },
    { id: 3, author: 'Hồ Quốc Tuấn', title: 'Signals worth watching in the modern economy', summary: 'A measured view of growth, rates, and long-term investment.', time: '3 days ago' },
  ];

  ngOnInit(): void {
    this.ui.mount('Subscriptions - Lingora');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  get visiblePosts() {
    return this.posts.filter((post) => !this.authorFilter || post.author === this.authorFilter);
  }

  unfollow(name: string): void {
    this.authors = this.authors.filter((author) => author.name !== name);
    if (this.authorFilter === name) this.authorFilter = '';
    localStorage.setItem('lingoraSubscribedAuthors', JSON.stringify(this.authors.map((author) => author.name)));
  }
}
