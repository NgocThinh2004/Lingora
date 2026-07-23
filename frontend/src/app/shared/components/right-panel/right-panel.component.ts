import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchModalService } from '../../../core/services/search-modal.service';
import { UserService } from '../../../features/users/services/user.service';
import { User } from '../../../features/users/models/user.model';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.scss',
})
export class RightPanelComponent {
  readonly searchModalService = inject(SearchModalService);
  private readonly userService = inject(UserService);

  readonly recommendedAuthors = signal<User[]>([]);

  constructor() {
    this.userService.getRecommended().subscribe({
      next: (authors) => this.recommendedAuthors.set(authors || []),
      error: () => this.recommendedAuthors.set([]),
    });
  }

  onSearchInput(_value?: string) {
    this.searchModalService.open();
  }
}
