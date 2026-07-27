import { Directive, ElementRef, HostListener, Input, OnChanges, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Directive({
  selector: 'img[appAssetImage]',
  standalone: true,
})
export class AssetImageDirective implements OnChanges {
  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private readonly staticBaseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
  private fallbackApplied = false;

  @Input() appAssetImage: string | null | undefined;
  @Input() assetFallback = 'assets/images/lingora-mark.svg';

  ngOnChanges(): void {
    this.fallbackApplied = false;
    this.image.src = this.resolveUrl(this.appAssetImage || this.assetFallback);
  }

  @HostListener('error')
  handleError(): void {
    if (this.fallbackApplied) {
      return;
    }

    this.fallbackApplied = true;
    this.image.src = this.resolveUrl(this.assetFallback);
  }

  private resolveUrl(url: string): string {
    const normalized = url.trim();
    if (
      /^(?:https?:)?\/\//i.test(normalized)
      || /^(?:data|blob):/i.test(normalized)
      || normalized.startsWith('assets/')
      || normalized.startsWith('/assets/')
    ) {
      return normalized;
    }

    if (normalized.startsWith('/uploads/')) {
      return `${this.staticBaseUrl}${normalized}`;
    }

    if (normalized.startsWith('uploads/')) {
      return `${this.staticBaseUrl}/${normalized}`;
    }

    return normalized;
  }
}
