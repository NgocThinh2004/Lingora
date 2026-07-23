import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { inject } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { MobileHeaderComponent } from '../../components/mobile-header/mobile-header.component';
import { RightPanelComponent } from '../../components/right-panel/right-panel.component';

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

  /** Đọc route.data.showRightPanel của route con đang active, mặc định true. */
  private readonly showRightPanel$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    startWith(null),
    map(() => {
      let route = this.activatedRoute.firstChild;
      while (route?.firstChild) route = route.firstChild;
      return (route?.snapshot?.data?.['showRightPanel'] ?? true) as boolean;
    }),
  );

  readonly showRightPanel = toSignal(this.showRightPanel$, { initialValue: true });

  private readonly contentMaxWidth$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    startWith(null),
    map(() => {
      let route = this.activatedRoute.firstChild;
      while (route?.firstChild) route = route.firstChild;
      return (route?.snapshot?.data?.['contentMaxWidth'] ?? '720px') as string;
    }),
  );

  readonly contentMaxWidth = toSignal(this.contentMaxWidth$, { initialValue: '720px' });

  openMobileSidebar() {
    this.mobileSidebarOpen.set(true);
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen.set(false);
  }
}
