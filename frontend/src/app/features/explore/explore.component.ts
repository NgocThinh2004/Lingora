import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
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

  query = '';
  tab = 'top';
  readonly results = [
    { type: 'posts', title: 'How AI is changing the way we build software', subtitle: 'Elena Rostova · Artificial Intelligence', icon: 'bi bi-file-text', href: '/post-detail?id=1' },
    { type: 'posts', title: 'Designing services that stay simple as they scale', subtitle: 'Thái Dương · Backend Engineering', icon: 'bi bi-file-text', href: '/post-detail?id=2' },
    { type: 'publications', title: 'Practical Engineering', subtitle: 'Architecture, backend systems, and reliable delivery', icon: 'bi bi-journal-richtext', href: '/home' },
    { type: 'people', title: 'Hoàng Anh', subtitle: 'UX & Product Designer', icon: 'bi bi-person', href: '/profile' },
  ];

  ngOnInit(): void {
    this.ui.mount('Lingora - Explore');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  get visibleResults() {
    const query = this.query.trim().toLowerCase();
    return this.results.filter((result) =>
      (this.tab === 'top' || result.type === this.tab) &&
      (!query || `${result.title} ${result.subtitle}`.toLowerCase().includes(query)),
    );
  }

  updateQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }
}
