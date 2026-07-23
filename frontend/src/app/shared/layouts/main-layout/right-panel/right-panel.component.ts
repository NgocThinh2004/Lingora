import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchModalService } from '../../../../core/ui/search-modal.service';
import { User } from '../../../../features/users/models/user.model';
import { UsersService } from '../../../../features/users/services/users.service';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.scss',
})
export class RightPanelComponent implements OnInit {
  readonly searchModalService = inject(SearchModalService);
  private readonly usersService = inject(UsersService);
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
    return user.avatarUrl || 'assets/images/lingora-mark.svg';
  }
}
