import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchModalService } from '../../../core/services/search-modal.service';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.scss',
})
export class RightPanelComponent {
  readonly searchModalService = inject(SearchModalService);

  onSearchInput(_value?: string) {
    this.searchModalService.open();
  }
}
