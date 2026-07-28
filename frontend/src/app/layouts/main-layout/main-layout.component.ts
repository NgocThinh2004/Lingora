import { CommonModule } from '@angular/common';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MobileHeaderComponent } from './mobile-header/mobile-header.component';
import { RightPanelComponent } from './right-panel/right-panel.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    MobileHeaderComponent,
    RightPanelComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly mobileSidebarOpen = signal(false);
  readonly showRightPanel = signal(true);
  readonly contentMaxWidth = signal('720px');
  readonly contentMode = signal<'default' | 'workspace'>('default');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncRouteLayout());

    // The layout is lazy-loaded, so its first NavigationEnd may predate this subscription.
    afterNextRender(() => this.syncRouteLayout());
  }

  openMobileSidebar(): void {
    this.mobileSidebarOpen.set(true);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  private syncRouteLayout(): void {
    let route = this.activatedRoute.firstChild;
    while (route?.firstChild) {
      route = route.firstChild;
    }

    const data = route?.snapshot.data ?? {};
    this.showRightPanel.set((data['showRightPanel'] ?? true) as boolean);
    this.contentMaxWidth.set((data['contentMaxWidth'] ?? '720px') as string);
    this.contentMode.set((data['contentMode'] ?? 'default') as 'default' | 'workspace');
  }
}
