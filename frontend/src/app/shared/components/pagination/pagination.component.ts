import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type PaginationItem = number | null;

export function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.min(total, Math.max(1, Math.floor(currentPage)));
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter(page => page >= 1 && page <= total)
    .sort((left, right) => left - right);

  return pages.flatMap((page, index) => {
    const previousPage = pages[index - 1];
    return previousPage !== undefined && page - previousPage > 1
      ? [null, page]
      : [page];
  });
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Output() readonly pageChange = new EventEmitter<number>();

  get normalizedCurrentPage(): number {
    return Math.min(Math.max(1, Math.floor(this.totalPages)), Math.max(1, Math.floor(this.currentPage)));
  }

  get items(): PaginationItem[] {
    return buildPaginationItems(this.normalizedCurrentPage, this.totalPages);
  }

  requestPage(page: number): void {
    const target = Math.min(Math.max(1, Math.floor(this.totalPages)), Math.max(1, Math.floor(page)));
    if (target !== this.normalizedCurrentPage) {
      this.pageChange.emit(target);
    }
  }

  trackItem(index: number, item: PaginationItem): string {
    return item === null ? `gap-${index}` : `page-${item}`;
  }
}
