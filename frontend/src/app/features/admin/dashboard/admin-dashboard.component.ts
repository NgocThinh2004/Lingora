import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../../core/locale/locale.service';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AdminDashboardOverview } from './models/admin-dashboard.model';
import { AdminDashboardService } from './services/admin-dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, UiStateComponent, AssetImageDirective, TranslatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  private readonly dashboardService = inject(AdminDashboardService);
  private readonly localeService = inject(LocaleService);

  readonly selectedLocale = this.localeService.selectedLocale;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly overview = signal<AdminDashboardOverview | null>(null);
  readonly stats = computed(() => {
    const summary = this.overview()?.summary;
    return [
      { label: 'total_users', icon: 'bi-people-fill', value: summary?.totalUsers ?? 0, route: '/admin/users' },
      { label: 'total_articles', icon: 'bi-journal-text', value: summary?.totalArticles ?? 0, route: '/admin/posts' },
      { label: 'total_comments', icon: 'bi-chat-dots-fill', value: summary?.totalComments ?? 0, route: null },
      { label: 'total_likes', icon: 'bi-heart-fill', value: summary?.totalLikes ?? 0, route: null },
    ];
  });
  readonly growthChart = computed(() => this.normalize(
    this.overview()?.users.growth.map(point => point.count) ?? [],
  ));
  readonly articleChart = computed(() => this.normalize(
    this.overview()?.posts.topArticles.map(article => article.viewCount) ?? [],
  ));

  constructor() {
    effect(() => this.loadOverview(this.selectedLocale()), { allowSignalWrites: true });
  }

  loadOverview(language = this.selectedLocale()): void {
    this.loading.set(true);
    this.error.set('');
    this.dashboardService.getOverview(language).subscribe({
      next: response => {
        this.overview.set(response.data);
        this.loading.set(false);
      },
      error: error => {
        this.error.set(this.localeService.translate('unable_load_dashboard'));
        this.loading.set(false);
      },
    });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.selectedLocale()).format(value);
  }

  dayLabel(date: string): string {
    return new Intl.DateTimeFormat(this.selectedLocale(), { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`${date}T00:00:00Z`));
  }

  private normalize(values: number[]): number[] {
    const maximum = Math.max(...values, 0);
    return values.map(value => maximum ? Math.max(5, Math.round((value / maximum) * 100)) : 0);
  }
}
