import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { SearchModalService } from '../../../features/search/search-modal.service';
import { User } from '../../../features/users/models/user.model';
import { UsersService } from '../../../features/users/services/users.service';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, AssetImageDirective, TranslatePipe],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.scss',
})
export class RightPanelComponent implements OnInit {
  readonly searchModalService = inject(SearchModalService);
  private readonly usersService = inject(UsersService);
  readonly router = inject(Router);
  readonly recommendedUsers = signal<User[]>([]);
  readonly recommendationsLoading = signal(true);

  ngOnInit(): void {
    this.usersService.getRecommended().subscribe({
      next: users => {
        this.recommendedUsers.set((users ?? []).slice(0, 3));
        this.recommendationsLoading.set(false);
      },
      error: () => this.recommendationsLoading.set(false),
    });
  }

  userAvatar(user: User): string {
    return user.avatarUrl ?? 'assets/images/default-avatar.svg';
  }

  get isExplorePage(): boolean {
    return this.router.url.startsWith('/explore');
  }

  openSearch(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.searchModalService.open();
  }
}
